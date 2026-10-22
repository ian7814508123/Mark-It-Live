import { visit } from 'unist-util-visit';
import { typographyAttrsToCssString, TypographyAttrs } from '../../utils/typographyUtils';

const DIRECTIVE_NAMES = new Set(['font', 'style', 'typography']);

/**
 * 自訂 Remark 排版外掛：remarkTypography
 * 支援：
 * 1. 區塊/標題級行尾 Directive：例如 `# 系統 :font{size="28px" color="#3b82f6"}`
 * 2. 行內文字局部 Directive：例如 `:font[重點文字]{color="red" size="14px"}`
 * 3. 容器級排版 Directive：例如 `:::typography{family="serif" size="18px"}\n段落\n:::`
 */
export default function remarkTypography() {
    return (tree: any) => {
        // 1. 先處理區塊節點（heading, paragraph, listItem）內掛載在結尾的 Directive
        visit(tree, (node: any) => {
            if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'listItem') {
                if (!Array.isArray(node.children)) return;

                const directiveIndices: number[] = [];
                const mergedAttrs: TypographyAttrs = {};

                node.children.forEach((child: any, idx: number) => {
                    if (child.type === 'textDirective' && DIRECTIVE_NAMES.has(child.name)) {
                        // 僅在 directive 沒有子文字內容時，代表是修飾整個父層區塊的標籤
                        if (!child.children || child.children.length === 0) {
                            directiveIndices.push(idx);
                            Object.assign(mergedAttrs, child.attributes || {});
                        }
                    }
                });

                if (directiveIndices.length > 0) {
                    const styleCss = typographyAttrsToCssString(mergedAttrs);

                    const data = node.data || (node.data = {});
                    const hProperties = data.hProperties || (data.hProperties = {});

                    hProperties.style = styleCss;
                    hProperties['data-typography'] = JSON.stringify(mergedAttrs);

                    // 從 children 中移除這些 directive 節點，防止渲染空文字或殘留符號
                    for (let i = directiveIndices.length - 1; i >= 0; i--) {
                        const targetIdx = directiveIndices[i];
                        node.children.splice(targetIdx, 1);
                        // 若前一個節點是純文字，去除多餘尾端空白
                        if (targetIdx > 0 && node.children[targetIdx - 1]?.type === 'text') {
                            node.children[targetIdx - 1].value = node.children[targetIdx - 1].value.replace(/\s+$/, '');
                        }
                    }
                }
            }
        });

        // 2. 處理具備子內容的行內 Directive 與 容器 Directive
        visit(tree, (node: any) => {
            if (node.type === 'textDirective' && DIRECTIVE_NAMES.has(node.name)) {
                // 有包裹文字內容：例如 `:font[這段文字]{color="red"}`
                if (node.children && node.children.length > 0) {
                    const styleCss = typographyAttrsToCssString(node.attributes || {});
                    const data = node.data || (node.data = {});
                    data.hName = 'span';
                    data.hProperties = {
                        ...(data.hProperties || {}),
                        style: styleCss,
                        className: ['typography-inline-span']
                    };
                }
            } else if (node.type === 'containerDirective' && DIRECTIVE_NAMES.has(node.name)) {
                // 容器排版區塊：例如 `:::typography{family="serif"}\n...\n:::`
                const styleCss = typographyAttrsToCssString(node.attributes || {});
                const data = node.data || (node.data = {});
                data.hName = 'div';
                data.hProperties = {
                    ...(data.hProperties || {}),
                    style: styleCss,
                    className: ['typography-container-block']
                };
            }
        });
    };
}
