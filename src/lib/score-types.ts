export type NoteTechnique =
  | 'normal'
  | 'hammer-on'
  | 'pull-off'
  | 'slide'
  | 'palm-mute'
  | 'bend'
  | 'vibrato'
  | 'accent'
  | 'staccato'
  | 'dead-note';

export interface ScoreNote {
  stringIndex: number;
  fret: number;
  technique: NoteTechnique;
}

export interface ScoreBeat {
  id: string;
  notes: ScoreNote[];
  chord?: string;
}

export interface ScoreMeasure {
  id: string;
  beats: ScoreBeat[];
}

export interface ScoreDocument {
  id: string;
  title: string;
  artist: string;
  tempo: number;
  timeSignature: '4/4';
  tuning: string[];
  measures: ScoreMeasure[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}
