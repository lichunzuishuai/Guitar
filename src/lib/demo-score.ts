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

function createDeadNote(stringIndex: number): ScoreNote {
  return {
    stringIndex,
    fret: 0,
    technique: 'dead-note',
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

  const chordVoicings: Record<string, ReadonlyArray<number | null>> = {
    Am7: [0, 1, 0, 2, 0, null],
    Fmaj7: [0, 1, 2, 3, 3, null],
    C: [0, 1, 0, 2, 3, null],
    G: [3, 0, 0, 0, 2, 3],
    Gsus4: [3, 1, 0, 0, 1, 3],
  };
  const arpeggioStrings = [5, 3, 2, 1, 0, 2, 3, 4, 3, 2, 1, 0, 2, 3, 4, 5];

  beats.forEach((beat, beatIndex) => {
    const chord = beat.chord;
    const voicing = chord ? chordVoicings[chord] : undefined;
    if (!voicing) {
      return;
    }

    if (beatIndex % 4 === 0) {
      voicing.forEach((fret, stringIndex) => {
        if (fret === null) {
          beat.notes.push(createDeadNote(stringIndex));
        } else {
          beat.notes.push(createNote(stringIndex, fret));
        }
      });
      return;
    }

    const arpeggioString = arpeggioStrings[beatIndex] ?? 0;
    const arpeggioFret = voicing[arpeggioString];
    if (arpeggioFret === null) {
      beat.notes.push(createDeadNote(arpeggioString));
    } else if (arpeggioFret !== undefined) {
      beat.notes.push(createNote(arpeggioString, arpeggioFret));
    }
  });

  if (measureIndex === 2) {
    beats[0].notes = [
      createDeadNote(5),
      createDeadNote(4),
      createNote(3, 2),
      createNote(2, 2),
      createNote(1, 1),
      createNote(0, 0),
    ];
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
