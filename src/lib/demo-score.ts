import type {
  ScoreBeat,
  ScoreDocument,
  ScoreMeasure,
  ScoreNote,
} from './score-types';

const tuning = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];

function createNote(stringIndex: number, fret: number): ScoreNote {
  return {
    stringIndex,
    fret,
    technique: 'normal',
  };
}

function createMeasure(measureIndex: number): ScoreMeasure {
  const chordNames = [
    ['Am7', 'Fmaj7', 'C', 'G'],
    ['Am7', 'Fmaj7', 'Gsus4', 'G'],
  ];
  const beats: ScoreBeat[] = Array.from({ length: 16 }, (_, beatIndex) => {
    const chord = chordNames[measureIndex]?.[beatIndex / 4];
    return {
      id: `demo-beat-${measureIndex}-${beatIndex}`,
      notes: [],
      ...(chord ? { chord } : {}),
    };
  });

  const riff: Array<[number, number, number]> = [
    [0, 5, 0],
    [2, 5, 3],
    [4, 4, 2],
    [6, 4, 3],
    [8, 3, 2],
    [10, 4, 3],
    [12, 4, 2],
    [14, 5, 3],
  ];

  if (measureIndex < 2) {
    riff.forEach(([beatIndex, stringIndex, fret]) => {
      beats[beatIndex]?.notes.push(createNote(stringIndex, fret));
    });
  }

  return {
    id: `demo-measure-${measureIndex}`,
    beats,
  };
}

/**
 * 构建后端不可用时使用的本地示例曲谱。
 *
 * @returns 可直接编辑和播放的示例曲谱
 */
export function createDemoScore(): ScoreDocument {
  const now = new Date().toISOString();
  return {
    id: 'local-demo-score',
    title: 'Midnight Signal',
    artist: 'Aster Lane',
    tempo: 96,
    timeSignature: '4/4',
    tuning,
    measures: Array.from({ length: 4 }, (_, index) => createMeasure(index)),
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}
