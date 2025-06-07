import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

// 初始化或加载设置。provider 对象现在为空，将动态填充。
const settings = Object.assign({
    provider: {},
}, extension_settings.customModels ?? {});

// 兼容旧版 ST 的 popup 导入逻辑
let popupCaller;
let popupType;
let popupResult;
try {
    const popup = await import('../../../popup.js');
    popupCaller = popup.callGenericPopup;
    popupType = popup.POPUP_TYPE;
    popupResult = popup.POPUP_RESULT;
} catch {
    popupCaller = (await import('../../../../script.js')).callPopup;
    popupType = { TEXT: 1 };
    popupResult = { AFFIRMATIVE: 1 };
}

// 动态查找所有模型选择器
const allModelSelectors = document.querySelectorAll('[id^="model_"][id$="_select"]');

allModelSelectors.forEach(sel => {
    // 从选择器的 id 中解析出 provider 名称
    // e.g., "model_openai_select" -> "openai"
    const provider = sel.id.substring('model_'.length, sel.id.length - '_select'.length);

    // 如果该 provider 无效或没有父元素，则跳过
    if (!provider || !sel.parentElement) return;

    // 确保 settings 对象中有该 provider 的条目
    if (!settings.provider[provider]) {
        settings.provider[provider] = [];
    }
    // 确保 settings 对象中有该 provider 的模型存储位置
    if (!settings[`${provider}_model`]) {
        settings[`${provider}_model`] = undefined;
    }

    const models = settings.provider[provider];
    const h4 = sel.parentElement.querySelector('h4');
    
    // 如果没有找到 h4 标题元素，则无法附加按钮，跳过
    if (!h4) return;
    
    // 避免重复添加按钮
    if (h4.querySelector('.stcm--btn')) return;

    const btn = document.createElement('div'); {
        btn.classList.add('stcm--btn', 'menu_button', 'fa-solid', 'fa-fw', 'fa-pen-to-square');
        btn.title = 'Edit custom models';
        btn.addEventListener('click', async () => {
            let inp;
            const dom = document.createElement('div'); {
                const header = document.createElement('h3');
                header.textContent = `Custom Models: ${provider}`;
                dom.append(header);

                const hint = document.createElement('small');
                hint.textContent = 'one model name per line';
                dom.append(hint);

                inp = document.createElement('textarea'); {
                    inp.classList.add('text_pole');
                    inp.rows = 20;
                    inp.value = models.join('\n');
                    dom.append(inp);
                }
            }
            const result = await popupCaller(dom, popupType.TEXT, null, { okButton: 'Save' });
            if (result == popupResult.AFFIRMATIVE) {
                while (models.pop());
                models.push(...inp.value.split('\n').filter(it => it.trim().length));
                extension_settings.customModels = settings;
                saveSettingsDebounced();
                populateOptGroup();
                if (settings[`${provider}_model`] && models.includes(settings[`${provider}_model`])) {
                    sel.value = settings[`${provider}_model`];
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
        h4.append(btn);
    }

    const grp = document.createElement('optgroup');
    grp.label = 'Custom Models';
    
    const populateOptGroup = () => {
        grp.innerHTML = '';
        for (const model of models) {
            const opt = document.createElement('option'); {
                opt.value = model;
                opt.textContent = model;
                grp.append(opt);
            }
        }
    };
    
    populateOptGroup();
    sel.insertBefore(grp, sel.children[0]);

    if (settings[`${provider}_model`] && models.includes(settings[`${provider}_model`])) {
        // 延迟一点设置，确保UI完全加载
        setTimeout(() => {
            sel.value = settings[`${provider}_model`];
            sel.dispatchEvent(new Event('change', { bubbles:true }));
        }, 100);
    }

    sel.addEventListener('change', (evt) => {
        // 只处理我们自定义模型组里的模型
        if (models.includes(sel.value)) {
            evt.stopImmediatePropagation();
            if (settings[`${provider}_model`] != sel.value) {
                settings[`${provider}_model`] = sel.value;
                extension_settings.customModels = settings;
                saveSettingsDebounced();
            }
        }
    });
});
