import { Injectable } from '@nestjs/common';

@Injectable()
export class TextHighlightingService {
  highlightText(submitText: string, highlights: string[]): string {
    if (!highlights || highlights.length === 0) {
      return submitText;
    }

    let highlightedText = submitText;

    // highlights를 길이 순으로 정렬 (긴 것부터 처리하여 부분 매칭 방지)
    const sortedHighlights = highlights
      .filter((highlight) => highlight && highlight.trim().length > 0)
      .sort((a, b) => b.length - a.length);

    for (const highlight of sortedHighlights) {
      const trimmedHighlight = highlight.trim();

      // 정확한 단어/구문 매칭을 위한 정규식
      // 단어 경계를 고려하여 부분 매칭 방지
      const regex = new RegExp(
        `(^|\\s|[.!?])(${this.escapeRegExp(trimmedHighlight)})(\\s|[.!?]|$)`,
        'gi',
      );

      highlightedText = highlightedText.replace(
        regex,
        (match, prefix, content, suffix) => {
          // 이미 <b> 태그로 감싸진 경우 중복 처리 방지
          if (match.includes('<b>')) {
            return match;
          }
          return `${prefix}<b>${content}</b>${suffix}`;
        },
      );
    }

    return highlightedText;
  }

  private escapeRegExp(string: string): string {
    // 정규식 특수문자 이스케이프
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 하이라이트된 텍스트에서 <b> 태그 제거
  removeHighlights(highlightedText: string): string {
    return highlightedText.replace(/<\/?b>/g, '');
  }

  // 하이라이트 통계 정보 반환
  getHighlightStats(highlightedText: string): {
    totalHighlights: number;
    highlightedWords: string[];
  } {
    const matches = highlightedText.match(/<b>(.*?)<\/b>/g) || [];
    const highlightedWords = matches.map((match: string) =>
      match.replace(/<\/?b>/g, '').trim(),
    );

    return {
      totalHighlights: matches.length,
      highlightedWords,
    };
  }
}
