//使用 npm run analyze:lighthouse {lighthouse report html path}
const fs = require('fs');
const path = require('path');

function parseLighthouseReport(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 錯誤: 找不到檔案 ${filePath}`);
        process.exit(1);
    }

    const html = fs.readFileSync(filePath, 'utf8');
    const startTag = 'window.__LIGHTHOUSE_JSON__ = {';
    const start = html.indexOf(startTag);

    if (start === -1) {
        console.error('❌ 錯誤: 在檔案中找不到 Lighthouse JSON 數據。這可能不是一個有效的 Lighthouse HTML 報告。');
        process.exit(1);
    }

    let braceCount = 0;
    let end = -1;
    let inString = false;
    let escape = false;

    for (let i = start + startTag.length - 1; i < html.length; i++) {
        const char = html[i];
        if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '"') inString = true;
        } else {
            if (char === '\\') escape = !escape;
            else if (char === '"' && !escape) inString = false;
            else escape = false;
        }
        if (braceCount === 0) {
            end = i + 1;
            break;
        }
    }

    if (end !== -1) {
        const jsonStr = html.slice(start + startTag.length - 1, end);
        try {
            const data = JSON.parse(jsonStr);
            const markdownLines = [];
            markdownLines.push('# 📊 Lighthouse 檢測報告分析 (Lighthouse Report Analysis)\n');
            markdownLines.push('## --- 整體分數 (Overall Scores) ---\n');
            
            console.log('\n📊 Lighthouse 檢測報告分析 (Lighthouse Report Analysis)\n');
            console.log('--- 整體分數 (Overall Scores) ---');
            
            const categories = data.categories;
            for (const key in categories) {
                const score = Math.round(categories[key].score * 100);
                const emoji = score >= 90 ? '🟢' : (score >= 50 ? '🟠' : '🔴');
                const line = `${emoji} **${categories[key].title}**: ${score}`;
                markdownLines.push(`- ${line}`);
                console.log(`${emoji} ${categories[key].title.padEnd(20)}: ${score}`);
            }

            markdownLines.push('\n## --- 潛在優化與問題項目 (Audits & Opportunities) ---\n');
            console.log('\n--- 潛在優化與問題項目 (Audits & Opportunities) ---');
            const audits = data.audits;

            for (const catId in categories) {
                const category = categories[catId];
                markdownLines.push(`### [${category.title}]`);
                console.log(`\n[${category.title}]`);
                
                let hasIssues = false;
                category.auditRefs.forEach(ref => {
                    const audit = audits[ref.id];
                    if (audit && audit.score !== null && audit.score < 1 && audit.scoreDisplayMode !== 'manual' && audit.scoreDisplayMode !== 'informative') {
                        hasIssues = true;
                        const scoreLog = `⚠️  **${audit.title}** (分數: ${Math.round(audit.score * 100)})`;
                        markdownLines.push(`- ${scoreLog}`);
                        console.log(`  ⚠️  ${audit.title} (分數: ${Math.round(audit.score * 100)})`);
                        if (audit.displayValue) {
                            markdownLines.push(`  - 💡 *詳情: ${audit.displayValue}*`);
                            console.log(`     💡 詳情: ${audit.displayValue}`);
                        }
                    }
                });
                
                if (!hasIssues) {
                    markdownLines.push('- 🎉 *完美！這個分類沒有任何問題。*\n');
                    console.log('  🎉 完美！這個分類沒有任何問題。');
                } else {
                    markdownLines.push('\n');
                }
            }
            console.log();

            // 輸出至檔案
            const outputFileName = filePath.replace(/\.html$/, '-analysis.md');
            fs.writeFileSync(outputFileName, markdownLines.join('\n'), 'utf8');
            console.log(`✅ 解析完成！已將詳細報告輸出至: ${outputFileName}\n`);

        } catch (e) {
            console.error('❌ JSON 解析失敗:', e.message);
        }
    }
}

// 處理命令列參數
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log(`
使用方式 (Usage):
  node scripts/lighthouse-parser.cjs <path-to-lighthouse-report.html>

範例 (Example):
  node scripts/lighthouse-parser.cjs ./report.html
    `);
    process.exit(1);
}

const targetPath = path.resolve(process.cwd(), args[0]);
parseLighthouseReport(targetPath);
