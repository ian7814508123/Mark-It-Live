import { visit } from 'unist-util-visit';

/**
 * 自訂 Remark 插件：remarkGridDirective
 * 搭配 remark-directive 使用，將 `:::row` 與 `:::col` 轉換為 Tailwind CSS 的 Grid/Flex 排版
 */
export default function remarkGridDirective() {
    return (tree: any) => {
        visit(tree, (node) => {
            if (
                node.type === 'textDirective' ||
                node.type === 'leafDirective' ||
                node.type === 'containerDirective'
            ) {
                if (node.name === 'row') {
                    console.log('Found :::row!');
                    const data = node.data || (node.data = {});
                    data.hName = 'div';
                    data.hProperties = {
                        ...(data.hProperties || {}),
                        className: ['flex', 'flex-row', 'gap-5', 'w-full', 'items-start', 'markdown-row']
                    };
                    console.log('Set row data:', data);
                } else if (node.name === 'col') {
                    console.log('Found :::col!');
                    const data = node.data || (node.data = {});
                    data.hName = 'div';
                    data.hProperties = {
                        ...(data.hProperties || {}),
                        className: ['flex-1', 'min-w-0', 'markdown-col']
                    };
                    console.log('Set col data:', data);
                }
            }
        });
    };
}
