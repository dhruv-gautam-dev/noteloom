/**
 * NoteLoom V2 - Study Note Parser
 * Parses Obsidian markdown notes into structured, pedagogical study objects
 * for clean, distraction-free reading with mental models, flow diagrams, and active recall.
 */

export function parseNoteContent(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { isTeacherNote: false, rawMarkdown: '' };
  }

  // Normalize line breaks
  const content = rawContent.replace(/\r/g, '');

  // Check if this note adheres to the Teacher Note format
  const hasConceptsSection = content.includes('## 💡 Important Concepts');
  const hasFrontmatter = content.startsWith('---');

  if (!hasConceptsSection) {
    return {
      isTeacherNote: false,
      rawMarkdown: content,
    };
  }

  // 1. Extract Frontmatter metadata
  const meta = {};
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
  if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split('\n');
    lines.forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();
        val = val.replace(/^["']|["']$/g, '');
        meta[key] = val;
      }
    });
  }

  // 2. Extract Title, Goal, and Prerequisites
  const titleMatch = content.match(/# Day \d+:\s*([^\n]+)/);
  const goalMatch = content.match(/> \*\*Goal:\*\*\s*([^\n]+)/);
  const prereqMatch = content.match(/> \*\*Prerequisites:\*\*\s*([^\n]+)/);

  const title = titleMatch ? titleMatch[1].trim() : meta.video_title || 'Study Note';
  const goal = goalMatch ? goalMatch[1].replace(/\s\s+$/, '').trim() : '';
  const prerequisites = prereqMatch ? prereqMatch[1].replace(/\s\s+$/, '').trim() : '';

  // 3. Extract Concepts Section
  const concepts = [];
  const conceptsSectionMatch = content.match(
    /## 💡 Important Concepts([\s\S]+?)(?=## 🔗 How the Concepts Connect|## 💻 Minimal Code|## 📌 Summary|$)/
  );

  if (conceptsSectionMatch) {
    const conceptsText = conceptsSectionMatch[1];
    // Split by `### <number>. `
    const conceptBlocks = conceptsText.split(/\n### \d+\.\s+/).slice(1);

    conceptBlocks.forEach((block, idx) => {
      const firstLineEnd = block.indexOf('\n');
      const name = (firstLineEnd !== -1 ? block.slice(0, firstLineEnd) : block).trim();

      const defMatch = block.match(/-\s*\*\*Definition:\*\*\s*([^\n]+)/);
      const analogyMatch = block.match(/-\s*\*\*Analogy:\*\*\s*([^\n]+)/);
      const whoMatch = block.match(/-\s*\*\*Who Does the Work & Data Flow:\*\*\s*([^\n]+)/);
      const exMatch = block.match(/-\s*\*\*Video's Example:\*\*\s*([^\n]+)/);
      const whyMatch = block.match(/-\s*\*\*Why It Matters:\*\*\s*([^\n]+)/);

      // Extract Gotchas and Production Gotchas
      const gotchasMatch = block.match(/-\s*\*\*Gotchas:\*\*([\s\S]+?)(?=-\s*\*\*Interview Questions:\*\*|$)/);
      const gotchasList = [];
      let productionGotcha = null;

      if (gotchasMatch) {
        const lines = gotchasMatch[1]
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('-'));

        for (const line of lines) {
          if (line.includes('Production/Safety Gotcha:')) {
            productionGotcha = line
              .replace(/^-\s*🚨\s*\*\*Production\/Safety Gotcha:\*\*\s*/, '')
              .replace(/^-\s*\*\*Production\/Safety Gotcha:\*\*\s*/, '')
              .trim();
          } else {
            const cleanGotcha = line.replace(/^-\s*/, '').trim();
            if (cleanGotcha && !cleanGotcha.toLowerCase().includes('none noted')) {
              gotchasList.push(cleanGotcha);
            }
          }
        }
      }

      // Extract Interview Questions
      const questions = [];
      const qSectionMatch = block.match(/-\s*\*\*Interview Questions:\*\*([\s\S]+?)$/);
      if (qSectionMatch) {
        const qText = qSectionMatch[1];
        const qPattern = /-\s*\*\*Q(?:\s*`?\(Extra\)`?)?:\*\*\s*(.+?)\n\s*-\s*\*\*A:\*\*\s*(.+?)(?=\n\s*-\s*\*\*Q|\n*$)/gs;
        let m;
        while ((m = qPattern.exec(qText)) !== null) {
          questions.push({
            question: m[1].trim(),
            answer: m[2].trim(),
            isExtra: m[0].includes('(Extra)'),
          });
        }
      }

      concepts.push({
        index: idx + 1,
        name,
        definition: defMatch ? defMatch[1].trim() : '',
        analogy: analogyMatch ? analogyMatch[1].trim() : '',
        whoDoesWork: whoMatch ? whoMatch[1].trim() : '',
        videoExample: exMatch ? exMatch[1].trim() : '',
        whyItMatters: whyMatch ? whyMatch[1].trim() : '',
        gotchas: gotchasList,
        productionGotcha,
        interviewQuestions: questions,
      });
    });
  }

  // 4. Extract How Concepts Connect
  const flowMatch = content.match(
    /## 🔗 How the Concepts Connect\n([\s\S]+?)(?=## 💻 Minimal Code|## 📌 Summary|$)/
  );
  const howConceptsConnect = flowMatch ? flowMatch[1].trim() : '';

  // 5. Extract Code Snippets
  const codeMatch = content.match(/## 💻 Minimal Code \/ Commands\n([\s\S]+?)(?=## 📌 Summary|$)/);
  let code = null;
  if (codeMatch) {
    const rawCodeBlock = codeMatch[1].trim();
    const codeFenceMatch = rawCodeBlock.match(/```(?:python|ts|js|bash)?\n([\s\S]+?)\n```/);
    if (codeFenceMatch) {
      code = codeFenceMatch[1].trim();
    } else if (!rawCodeBlock.includes('No code or commands demonstrated')) {
      code = rawCodeBlock;
    }
  }

  // 6. Extract Summary & Practice
  const summarySectionMatch = content.match(/## 📌 Summary & Practice\n([\s\S]+?)$/);
  let summary = '';
  const openDoubts = [];
  let practiceTask = '';

  if (summarySectionMatch) {
    const sText = summarySectionMatch[1];
    const sMatch = sText.match(/-\s*\*\*Summary:\*\*\s*([^\n]+)/);
    if (sMatch) summary = sMatch[1].trim();

    const taskMatch = sText.match(/-\s*\*\*Apply It \(Practice Task\):\*\*\s*([^\n]+)/);
    if (taskMatch) practiceTask = taskMatch[1].trim();

    const doubtsMatch = sText.match(/-\s*\*\*Open Doubts \/ To Look Up:\*\*([\s\S]+?)(?=-\s*\*\*Apply It|$)/);
    if (doubtsMatch) {
      const dLines = doubtsMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('-'));
      for (const line of dLines) {
        const cleanDoubt = line.replace(/^-\s*/, '').trim();
        if (cleanDoubt && !cleanDoubt.toLowerCase().includes('none')) {
          openDoubts.push(cleanDoubt);
        }
      }
    }
  }

  return {
    isTeacherNote: true,
    meta,
    title,
    goal,
    prerequisites,
    concepts,
    howConceptsConnect,
    code,
    summary,
    openDoubts,
    practiceTask,
    rawMarkdown: content,
  };
}

