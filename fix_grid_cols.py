import re

with open(r'src\app\components\MainCanvas\index.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

pattern = r'''    const updateCols = \(\) => \{
      const container = document\.getElementById\("main-scroll-container"\);
      const w = container \? container\.clientWidth : window\.innerWidth;
      // Account for 16px gap and 160px min width
      const c = Math\.max\(1, Math\.floor\(\(w \+ 16\) / 176\)\);
      setCols\(c\);
    \};'''

replacement = '''    const updateCols = () => {
      const container = document.getElementById("main-scroll-container");
      let w = container ? container.clientWidth : window.innerWidth;
      
      let padding = 0;
      if (container) {
          const styles = window.getComputedStyle(container);
          padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      }
      w = w - padding;

      const isMobile = window.innerWidth < 768;
      const minCardWidth = isMobile ? 150 : 200;
      const gap = 16;
      
      const c = Math.max(1, Math.floor((w + gap) / (minCardWidth + gap)));
      setCols(c);
    };'''

if pattern not in c and re.search(pattern, c) is None:
    print("Pattern not found!")

c = re.sub(pattern, replacement, c)

with open(r'src\app\components\MainCanvas\index.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
