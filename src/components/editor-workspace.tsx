'use client';

import {
  ChevronDown,
  CircleHelp,
  Download,
  Guitar,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Share2,
  SkipBack,
  Square,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { createDemoScore } from '@/lib/demo-score';
import {
  deleteGuitarSample,
  listGuitarSamples,
  saveGuitarSamples,
  type GuitarSampleRecord,
} from '@/lib/guitar-sample-store';
import { createScore, fetchScoreList, updateScore } from '@/lib/score-api';
import type {
  NoteTechnique,
  ScoreBeat,
  ScoreDocument,
  ScoreMeasure,
} from '@/lib/score-types';

const stringNames = ['1弦 · E', '2弦 · B', '3弦 · G', '4弦 · D', '5弦 · A', '6弦 · E'];
const openStringMidi = [64, 59, 55, 50, 45, 40];
const fretOptions = Array.from({ length: 25 }, (_, index) => index);
const techniques: Array<{
  value: NoteTechnique;
  label: string;
  glyph: string;
}> = [
  { value: 'normal', label: '普通', glyph: '●' },
  { value: 'hammer-on', label: '击弦', glyph: 'h' },
  { value: 'pull-off', label: '勾弦', glyph: 'p' },
  { value: 'slide', label: '滑音', glyph: '/' },
  { value: 'palm-mute', label: '闷音', glyph: 'P.M.' },
  { value: 'bend', label: '推弦', glyph: '↗' },
  { value: 'vibrato', label: '揉弦', glyph: '~' },
  { value: 'accent', label: '重音', glyph: '>' },
  { value: 'staccato', label: '断音', glyph: '·' },
  { value: 'dead-note', label: '闷击', glyph: 'x' },
];
const noteSymbols = [
  { label: '全音符', glyph: '𝅝' },
  { label: '二分音符', glyph: '𝅗𝅥' },
  { label: '四分音符', glyph: '♩' },
  { label: '八分音符', glyph: '♪' },
  { label: '十六分音符', glyph: '♫' },
  { label: '三连音', glyph: '♬' },
];
const chordPresets = [
  {
    name: 'C',
    notes: [
      { stringIndex: 0, fret: 0 },
      { stringIndex: 1, fret: 1 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 4, fret: 3 },
    ],
  },
  {
    name: 'G',
    notes: [
      { stringIndex: 0, fret: 3 },
      { stringIndex: 1, fret: 0 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 0 },
      { stringIndex: 4, fret: 2 },
      { stringIndex: 5, fret: 3 },
    ],
  },
  {
    name: 'Am',
    notes: [
      { stringIndex: 0, fret: 0 },
      { stringIndex: 1, fret: 1 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 4, fret: 0 },
    ],
  },
  {
    name: 'Em',
    notes: [
      { stringIndex: 0, fret: 0 },
      { stringIndex: 1, fret: 0 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 4, fret: 2 },
      { stringIndex: 5, fret: 0 },
    ],
  },
  {
    name: 'F',
    notes: [
      { stringIndex: 0, fret: 1 },
      { stringIndex: 1, fret: 1 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 4, fret: 3 },
      { stringIndex: 5, fret: 1 },
    ],
  },
  {
    name: 'Dm',
    notes: [
      { stringIndex: 0, fret: 1 },
      { stringIndex: 1, fret: 3 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 3, fret: 0 },
    ],
  },
  {
    name: 'Am7',
    notes: [
      { stringIndex: 0, fret: 0 },
      { stringIndex: 1, fret: 1 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 2 },
      { stringIndex: 4, fret: 0 },
    ],
  },
  {
    name: 'Fmaj7',
    notes: [
      { stringIndex: 0, fret: 0 },
      { stringIndex: 1, fret: 1 },
      { stringIndex: 2, fret: 2 },
      { stringIndex: 3, fret: 3 },
      { stringIndex: 4, fret: 3 },
    ],
  },
  {
    name: 'Gsus4',
    notes: [
      { stringIndex: 0, fret: 3 },
      { stringIndex: 1, fret: 1 },
      { stringIndex: 2, fret: 0 },
      { stringIndex: 3, fret: 0 },
      { stringIndex: 4, fret: 2 },
      { stringIndex: 5, fret: 3 },
    ],
  },
] as const;

type EditorTool = 'select' | 'note' | 'chord' | 'sound' | 'more';

const toolTitles: Record<EditorTool, string> = {
  select: '选择工具',
  note: '音符工具',
  chord: '和弦工具',
  sound: '声音设置',
  more: '更多工具',
};

interface CellPosition {
  measureIndex: number;
  beatIndex: number;
  stringIndex: number;
}

interface HistoryState {
  score: ScoreDocument;
  selectedCell: CellPosition | null;
}

/**
 * 渲染 Guitar 编辑器的主工作台。
 *
 * @returns 具备曲谱编辑、播放、保存和练习控制的工作台
 */
export default function EditorWorkspace() {
  const [score, setScore] = useState<ScoreDocument>(() => createDemoScore());
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>({
    measureIndex: 0,
    beatIndex: 0,
    stringIndex: 5,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState({ measureIndex: 0, beatIndex: 0 });
  const [tempo, setTempo] = useState(96);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>(
    'saved',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [volume, setVolume] = useState(0.73);
  const [isMuted, setIsMuted] = useState(false);
  const [guitarSamples, setGuitarSamples] = useState<GuitarSampleRecord[]>([]);
  const [isImportingSamples, setIsImportingSamples] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pluckBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sampleBufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sampleDecodePromiseRef = useRef<Map<string, Promise<AudioBuffer>>>(
    new Map(),
  );
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const sampleInputRef = useRef<HTMLInputElement | null>(null);

  const currentBeat = selectedCell
    ? score.measures[selectedCell.measureIndex]?.beats[selectedCell.beatIndex]
    : undefined;
  const selectedNote = currentBeat?.notes.find(
    (note) => note.stringIndex === selectedCell?.stringIndex,
  );

  /**
   * 播放当前拍位，优先使用已导入采样，缺失音高回退到拨弦物理合成。
   *
   * @param beat 待播放拍位
   */
  const playBeat = useCallback(async (beat?: ScoreBeat) => {
    if (
      !beat?.notes.length ||
      isMuted ||
      volume <= 0 ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }

    const audioContext =
      audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = audioContext;
    await audioContext.resume();

    const playableNotes = [...beat.notes].sort(
      (firstNote, secondNote) =>
        secondNote.stringIndex - firstNote.stringIndex,
    );
    const preparedNotes = await Promise.all(
      playableNotes.map(async (note) => {
        const sample = findClosestGuitarSample(
          guitarSamples,
          note.stringIndex,
          note.fret,
        );
        if (!sample) {
          return { note, sample: undefined, sampleBuffer: undefined };
        }
        try {
          const sampleBuffer = await decodeGuitarSample(
            audioContext,
            sample,
            sampleBufferCacheRef.current,
            sampleDecodePromiseRef.current,
          );
          return { note, sample, sampleBuffer };
        } catch {
          return { note, sample: undefined, sampleBuffer: undefined };
        }
      }),
    );
    const startTime = audioContext.currentTime + 0.012;
    const masterGain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    const roomDelay = audioContext.createDelay(0.1);
    const roomGain = audioContext.createGain();
    const normalizedVolume =
      (volume * 0.68) / Math.sqrt(Math.max(preparedNotes.length, 1));

    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.22;
    masterGain.gain.setValueAtTime(normalizedVolume, startTime);
    roomDelay.delayTime.value = 0.032;
    roomGain.gain.value = 0.09;
    compressor.connect(masterGain);
    roomDelay.connect(roomGain);
    roomGain.connect(compressor);
    masterGain.connect(audioContext.destination);

    let activeSourceCount = preparedNotes.length;
    preparedNotes.forEach(({ note, sample, sampleBuffer }, noteIndex) => {
      const midi = (openStringMidi[note.stringIndex] ?? 40) + note.fret;
      const frequency = 440 * 2 ** ((midi - 69) / 12);
      const isPalmMuted = note.technique === 'palm-mute';
      let duration = isPalmMuted ? 0.42 : 1.55 + note.stringIndex * 0.06;
      const source = audioContext.createBufferSource();
      const highPass = audioContext.createBiquadFilter();
      const lowPass = audioContext.createBiquadFilter();
      const bodyResonance = audioContext.createBiquadFilter();
      const noteGain = audioContext.createGain();
      const stereoPanner = audioContext.createStereoPanner();
      const noteStartTime = startTime + noteIndex * 0.018;

      if (sample && sampleBuffer) {
        const playbackRate = 2 ** ((note.fret - sample.fret) / 12);
        source.buffer = sampleBuffer;
        source.playbackRate.value = playbackRate;
        duration = Math.min(
          4,
          Math.max(0.16, sampleBuffer.duration / playbackRate),
        );
      } else {
        const damping = isPalmMuted ? 0.982 : 0.996;
        const brightness = isPalmMuted ? 0.82 : 0.58;
        const bufferCacheKey = [
          audioContext.sampleRate,
          midi,
          note.stringIndex,
          note.technique,
        ].join(':');
        let pluckBuffer = pluckBufferCacheRef.current.get(bufferCacheKey);
        if (!pluckBuffer) {
          pluckBuffer = createPluckedStringBuffer(
            audioContext,
            frequency,
            duration,
            damping,
            brightness,
          );
          pluckBufferCacheRef.current.set(bufferCacheKey, pluckBuffer);
        }
        source.buffer = pluckBuffer;
      }

      source.detune.value = (Math.random() - 0.5) * 3;
      highPass.type = 'highpass';
      highPass.frequency.value = sampleBuffer ? 42 : 58;
      highPass.Q.value = 0.55;
      lowPass.type = 'lowpass';
      lowPass.frequency.value = sampleBuffer
        ? isPalmMuted
          ? 1800
          : 7200
        : isPalmMuted
          ? 1350
          : 3900 + note.fret * 35;
      lowPass.Q.value = 0.72;
      bodyResonance.type = 'peaking';
      bodyResonance.frequency.value = 105 + note.stringIndex * 12;
      bodyResonance.Q.value = 1.1;
      bodyResonance.gain.value = sampleBuffer ? 1.4 : 3.2;
      stereoPanner.pan.value = (2.5 - note.stringIndex) * 0.07;
      const notePeakGain = sampleBuffer
        ? note.technique === 'hammer-on'
          ? 0.5
          : 0.72
        : note.technique === 'hammer-on'
          ? 0.62
          : 0.9;
      noteGain.gain.setValueAtTime(0.0001, noteStartTime);
      noteGain.gain.exponentialRampToValueAtTime(
        notePeakGain,
        noteStartTime + 0.006,
      );
      if (sampleBuffer) {
        noteGain.gain.setValueAtTime(
          notePeakGain,
          noteStartTime + Math.max(0.012, duration - 0.06),
        );
      }
      noteGain.gain.exponentialRampToValueAtTime(
        0.0001,
        noteStartTime + duration,
      );

      source.connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(bodyResonance);
      bodyResonance.connect(noteGain);
      noteGain.connect(stereoPanner);
      stereoPanner.connect(compressor);
      stereoPanner.connect(roomDelay);
      source.start(noteStartTime);
      source.stop(noteStartTime + duration + 0.01);
      source.onended = () => {
        activeSourceCount -= 1;
        if (activeSourceCount === 0) {
          compressor.disconnect();
          roomDelay.disconnect();
          roomGain.disconnect();
          masterGain.disconnect();
        }
      };
    });
  }, [guitarSamples, isMuted, volume]);

  const recordHistory = useCallback(() => {
    setHistory((items) => [
      ...items.slice(-49),
      {
        score,
        selectedCell,
      },
    ]);
    setFuture([]);
  }, [score, selectedCell]);

  useEffect(() => {
    let isMounted = true;
    const loadScore = async () => {
      try {
        const scores = await fetchScoreList();
        const initialScore = scores[0] ?? (await createScore('demo'));
        if (isMounted) {
          setScore(initialScore);
          setTempo(initialScore.tempo);
          setSaveState('saved');
        }
      } catch {
        if (isMounted) {
          setSaveState('offline');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadScore();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadGuitarSamples = async () => {
      try {
        const samples = await listGuitarSamples();
        if (isMounted) {
          setGuitarSamples(samples);
        }
      } catch {
        if (isMounted) {
          setNotice('本地音源加载失败');
        }
      }
    };

    void loadGuitarSamples();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || score.id === 'local-demo-score') {
      return;
    }

    const saveTimer = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        await updateScore(score.id, {
          title: score.title,
          artist: score.artist,
          tempo,
          measures: score.measures,
        });
        setSaveState('saved');
      } catch {
        setSaveState('offline');
      }
    }, 900);

    return () => window.clearTimeout(saveTimer);
  }, [isLoading, score, tempo]);

  useEffect(() => {
    const pluckBufferCache = pluckBufferCacheRef.current;
    const sampleBufferCache = sampleBufferCacheRef.current;
    const sampleDecodePromises = sampleDecodePromiseRef.current;
    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
      pluckBufferCache.clear();
      sampleBufferCache.clear();
      sampleDecodePromises.clear();
      void audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const noticeTimer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(noticeTimer);
  }, [notice]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const beatDuration = 60000 / tempo / 4;
    playTimerRef.current = setInterval(() => {
      setPlayhead((current) => {
        const nextBeatIndex = current.beatIndex + 1;
        if (nextBeatIndex < 16) {
          void playBeat(
            score.measures[current.measureIndex]?.beats[nextBeatIndex],
          );
          return { ...current, beatIndex: nextBeatIndex };
        }

        const nextMeasureIndex = current.measureIndex + 1;
        if (nextMeasureIndex >= score.measures.length) {
          setIsPlaying(false);
          return { measureIndex: 0, beatIndex: 0 };
        }

        void playBeat(score.measures[nextMeasureIndex]?.beats[0]);
        return { measureIndex: nextMeasureIndex, beatIndex: 0 };
      });
    }, beatDuration);

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, playBeat, score.measures, tempo]);

  const measureCountLabel = useMemo(
    () => `${score.measures.length} 小节`,
    [score.measures.length],
  );

  /**
   * 更新曲谱标题。
   *
   * @param title 新标题
   */
  function handleTitleChange(title: string) {
    recordHistory();
    setScore((current) => ({ ...current, title }));
  }

  /**
   * 修改当前选中琴弦上的品位。
   *
   * @param fret 目标品位
   */
  function handleFretChange(fret: number) {
    if (!selectedCell) {
      return;
    }
    recordHistory();
    setScore((current) => updateScoreNote(current, selectedCell, fret));
  }

  /**
   * 修改当前选中音符的演奏技巧。
   *
   * @param technique 目标技巧
   */
  function handleTechniqueChange(technique: NoteTechnique) {
    if (!selectedCell) {
      return;
    }
    recordHistory();
    setScore((current) =>
      updateScoreTechnique(current, selectedCell, technique),
    );
  }

  /**
   * 处理谱面点击：选择工具只更新选区，音符工具会在空拍位创建空弦音。
   *
   * @param position 目标位置
   */
  function handleScoreCellClick(position: CellPosition) {
    setSelectedCell(position);
    if (activeTool !== 'note') {
      return;
    }
    const beat = score.measures[position.measureIndex]?.beats[position.beatIndex];
    const hasNote = beat?.notes.some(
      (note) => note.stringIndex === position.stringIndex,
    );
    if (!hasNote) {
      recordHistory();
      setScore((current) => updateScoreNote(current, position, 0));
    }
  }

  /**
   * 删除当前选中琴弦上的音符。
   */
  function handleDeleteNote() {
    if (!selectedCell || !selectedNote) {
      return;
    }
    recordHistory();
    setScore((current) => removeScoreNote(current, selectedCell));
  }

  /**
   * 撤销最近一次曲谱变更。
   */
  function handleUndo() {
    const previous = history.at(-1);
    if (!previous) {
      return;
    }
    setFuture((items) => [
      ...items,
      {
        score,
        selectedCell,
      },
    ]);
    setScore(previous.score);
    setSelectedCell(previous.selectedCell);
    setHistory((items) => items.slice(0, -1));
  }

  /**
   * 重做被撤销的曲谱变更。
   */
  function handleRedo() {
    const next = future.at(-1);
    if (!next) {
      return;
    }
    setHistory((items) => [
      ...items,
      {
        score,
        selectedCell,
      },
    ]);
    setScore(next.score);
    setSelectedCell(next.selectedCell);
    setFuture((items) => items.slice(0, -1));
  }

  /**
   * 在曲谱末尾新增一个空白小节。
   */
  function handleAddMeasure() {
    recordHistory();
    const newMeasure: ScoreMeasure = {
      id: `measure-${crypto.randomUUID()}`,
      beats: Array.from({ length: 16 }, (_, beatIndex): ScoreBeat => ({
        id: `beat-${crypto.randomUUID()}-${beatIndex}`,
        notes: [],
      })),
    };
    setScore((current) => ({
      ...current,
      measures: [...current.measures, newMeasure],
    }));
    setSelectedCell({
      measureIndex: score.measures.length,
      beatIndex: 0,
      stringIndex: 5,
    });
    setNotice('已在曲谱末尾添加小节');
  }

  /**
   * 切换左侧编辑工具，并在窄屏下打开对应检查器。
   *
   * @param tool 目标编辑工具
   */
  function handleToolSelect(tool: EditorTool) {
    setActiveTool(tool);
    setIsInspectorOpen(true);
  }

  /**
   * 将预设和弦写入当前选中的拍位。
   *
   * @param chordName 和弦名称
   * @param notes 和弦指法
   */
  function handleApplyChord(
    chordName: string,
    notes: ReadonlyArray<{ stringIndex: number; fret: number }>,
  ) {
    if (!selectedCell) {
      return;
    }
    recordHistory();
    setScore((current) =>
      updateScoreBeatNotes(
        current,
        selectedCell.measureIndex,
        selectedCell.beatIndex,
        notes,
        chordName,
      ),
    );
    setNotice(`已应用 ${chordName} 和弦`);
  }

  /**
   * 清除当前拍位的和弦标记，但保留已经录入的音符。
   */
  function handleClearChord() {
    if (!selectedCell || !currentBeat?.chord) {
      return;
    }
    recordHistory();
    setScore((current) =>
      updateScoreBeatChord(current, selectedCell, undefined),
    );
    setNotice('已清除和弦标记');
  }

  /**
   * 打开本地曲谱文件选择器。
   */
  function handleOpenImport() {
    importInputRef.current?.click();
  }

  /**
   * 打开本地吉他音源文件选择器。
   */
  function handleOpenSampleImport() {
    sampleInputRef.current?.click();
  }

  /**
   * 导入并校验本地吉他采样，成功后保存到 IndexedDB。
   *
   * @param event 音频文件选择事件
   */
  async function handleImportGuitarSamples(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selectedFiles.length || typeof window === 'undefined') {
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextConstructor) {
      setNotice('当前浏览器不支持音源解码');
      return;
    }

    setIsImportingSamples(true);
    const audioContext =
      audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = audioContext;
    const importedSamples: GuitarSampleRecord[] = [];
    let skippedFileCount = Math.max(0, selectedFiles.length - 60);

    for (const file of selectedFiles.slice(0, 60)) {
      const samplePosition = inferGuitarSamplePosition(file.name);
      const hasSupportedExtension = /\.(wav|mp3|ogg)$/i.test(file.name);
      if (
        !samplePosition ||
        !hasSupportedExtension ||
        file.size > 20 * 1024 * 1024
      ) {
        skippedFileCount += 1;
        continue;
      }

      try {
        const audioData = await file.arrayBuffer();
        const decodedBuffer = await audioContext.decodeAudioData(
          audioData.slice(0),
        );
        const sampleId = `${samplePosition.stringIndex}:${samplePosition.fret}`;
        const sample: GuitarSampleRecord = {
          id: sampleId,
          name: file.name,
          stringIndex: samplePosition.stringIndex,
          fret: samplePosition.fret,
          mimeType: file.type || 'audio/wav',
          audioData,
          importedAt: new Date().toISOString(),
        };
        importedSamples.push(sample);
        sampleBufferCacheRef.current.set(sampleId, decodedBuffer);
      } catch {
        skippedFileCount += 1;
      }
    }

    try {
      if (importedSamples.length) {
        await saveGuitarSamples(importedSamples);
        setGuitarSamples((currentSamples) =>
          sortGuitarSamples([
            ...new Map(
              [...currentSamples, ...importedSamples].map((sample) => [
                sample.id,
                sample,
              ]),
            ).values(),
          ]),
        );
      }
      if (!importedSamples.length) {
        setNotice('未导入：请按琴弦和品位命名音源文件');
      } else if (skippedFileCount) {
        setNotice(
          `已导入 ${importedSamples.length} 个音源，跳过 ${skippedFileCount} 个文件`,
        );
      } else {
        setNotice(`已导入 ${importedSamples.length} 个吉他音源`);
      }
    } catch {
      setNotice('音源保存失败，请检查浏览器存储空间');
    } finally {
      setIsImportingSamples(false);
    }
  }

  /**
   * 从浏览器音源库中删除指定采样。
   *
   * @param sample 待删除采样
   */
  async function handleDeleteGuitarSample(sample: GuitarSampleRecord) {
    try {
      await deleteGuitarSample(sample.id);
      sampleBufferCacheRef.current.delete(sample.id);
      sampleDecodePromiseRef.current.delete(sample.id);
      setGuitarSamples((currentSamples) =>
        currentSamples.filter((currentSample) => currentSample.id !== sample.id),
      );
      setNotice(`已删除 ${sample.name}`);
    } catch {
      setNotice('音源删除失败');
    }
  }

  /**
   * 导入本项目导出的 JSON 曲谱，并作为本地草稿载入。
   *
   * @param event 文件选择事件
   */
  async function handleImportScore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      const importedScore: unknown = JSON.parse(await file.text());
      if (!isScoreDocument(importedScore)) {
        throw new Error('Invalid score document');
      }
      recordHistory();
      setScore({
        ...importedScore,
        id: 'local-demo-score',
        updatedAt: new Date().toISOString(),
      });
      setTempo(importedScore.tempo);
      setSelectedCell(null);
      setSaveState('offline');
      setActiveTool('select');
      setNotice('曲谱已导入为本地草稿');
    } catch {
      setNotice('导入失败：请选择有效的曲谱 JSON');
    }
  }

  /**
   * 将当前曲谱导出为可再次导入的 JSON 文件。
   */
  function handleExportScore() {
    const fileContent = JSON.stringify(score, null, 2);
    const fileBlob = new Blob([fileContent], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(fileBlob);
    const downloadLink = document.createElement('a');
    const safeTitle =
      score.title.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-') ||
      'guitar-score';
    downloadLink.href = downloadUrl;
    downloadLink.download = `${safeTitle}.json`;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
    setNotice('曲谱 JSON 已导出');
  }

  /**
   * 播放或暂停当前曲谱。
   */
  function handleTogglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setPlayhead({ measureIndex: 0, beatIndex: 0 });
    void playBeat(score.measures[0]?.beats[0]);
    setIsPlaying(true);
  }

  /**
   * 停止播放并将播放头归零。
   */
  function handleStopPlayback() {
    setIsPlaying(false);
    setPlayhead({ measureIndex: 0, beatIndex: 0 });
  }

  /**
   * 保存当前曲谱到后端，后端不可用时保留本地编辑状态。
   */
  async function handleSaveScore() {
    setSaveState('saving');
    try {
      const savedScore = await updateScore(score.id, {
        title: score.title,
        artist: score.artist,
        tempo,
        measures: score.measures,
      });
      setScore(savedScore);
      setSaveState('saved');
    } catch {
      setSaveState('offline');
    }
  }

  /**
   * 格式化保存状态用于界面展示。
   *
   * @returns 保存状态文案
   */
  function getSaveStateLabel(): string {
    if (saveState === 'saving') {
      return '保存中…';
    }
    if (saveState === 'offline') {
      return '本地草稿';
    }
    return '已保存';
  }

  return (
    <main className="editor-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Music2 size={18} strokeWidth={2.4} />
          </div>
          <span>Stringline</span>
          <span className="brand-divider">/</span>
          <span className="brand-section">Studio</span>
        </div>
        <div className="topbar-center">
          <span className="status-dot" />
          <span>{score.title}</span>
          <span className="topbar-track-meta">· {score.artist || '未署名'}</span>
          <ChevronDown size={14} />
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" title="帮助" aria-label="帮助">
            <CircleHelp size={17} />
          </button>
          <button className="ghost-button" title="更多选项" aria-label="更多选项">
            <MoreHorizontal size={19} />
          </button>
          <div className="user-avatar">AL</div>
        </div>
      </header>

      <section className="workspace-header">
        <div className="breadcrumb">
          <span>我的曲谱</span>
          <span className="breadcrumb-slash">/</span>
          <span className="breadcrumb-current">编辑器</span>
        </div>
        <div className="document-heading">
          <div>
            <input
              className="title-input"
              value={score.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              aria-label="曲谱标题"
            />
            <div className="subtitle-line">
              <span>{score.artist || '未署名'}</span>
              <span className="subtitle-dot">·</span>
              <span>{measureCountLabel}</span>
              <span className="subtitle-dot">·</span>
              <span>{score.timeSignature}</span>
            </div>
          </div>
          <div className="document-actions">
            <span className={`save-state ${saveState}`}>
              <span className="save-state-dot" />
              {getSaveStateLabel()}
            </span>
            <button
              className="outline-button"
              onClick={() => void handleSaveScore()}
              disabled={saveState === 'saving'}
            >
              <Save size={15} />
              保存
            </button>
            <button className="outline-button">
              <Share2 size={15} />
              分享
            </button>
            <button className="primary-button">
              <WandSparkles size={15} />
              AI 助手
            </button>
          </div>
        </div>
      </section>

      <div className="editor-body">
        <aside className="tool-rail">
          <div className="rail-group">
            <div className="rail-label">编辑</div>
            <button
              className={`rail-button ${activeTool === 'select' ? 'active' : ''}`}
              title="选择工具"
              aria-label="选择工具"
              aria-pressed={activeTool === 'select'}
              onClick={() => handleToolSelect('select')}
            >
              <Guitar size={19} />
              <span>选择</span>
            </button>
            <button
              className={`rail-button ${activeTool === 'note' ? 'active' : ''}`}
              title="音符工具"
              aria-label="音符工具"
              aria-pressed={activeTool === 'note'}
              onClick={() => handleToolSelect('note')}
            >
              <Music2 size={18} />
              <span>音符</span>
            </button>
            <button
              className={`rail-button ${activeTool === 'chord' ? 'active' : ''}`}
              title="和弦工具"
              aria-label="和弦工具"
              aria-pressed={activeTool === 'chord'}
              onClick={() => handleToolSelect('chord')}
            >
              <span className="rail-chord-icon">C</span>
              <span>和弦</span>
            </button>
          </div>
          <div className="rail-divider" />
          <div className="notation-palette">
            <div className="palette-label">音符 / 技巧</div>
            <div className="palette-symbol-grid">
              {noteSymbols.map((symbol) => (
                <button
                  className="palette-button"
                  key={symbol.label}
                  title={symbol.label}
                  aria-label={symbol.label}
                  onClick={() => {
                    handleToolSelect('note');
                    setNotice(`${symbol.label}：点击谱面输入`);
                  }}
                >
                  {symbol.glyph}
                </button>
              ))}
              {techniques.map((technique) => (
                <button
                  className={`palette-button technique-symbol ${selectedNote?.technique === technique.value ? 'active' : ''}`}
                  key={technique.value}
                  title={technique.label}
                  aria-label={technique.label}
                  onClick={() => {
                    handleToolSelect('note');
                    handleTechniqueChange(technique.value);
                  }}
                >
                  {technique.glyph}
                </button>
              ))}
            </div>
          </div>
          <div className="rail-divider" />
          <div className="rail-group">
            <div className="rail-label">结构</div>
            <button
              className="rail-button"
              title="添加小节"
              aria-label="添加小节"
              onClick={handleAddMeasure}
            >
              <Plus size={19} />
              <span>小节</span>
            </button>
            <button
              className="rail-button"
              title="导入曲谱"
              aria-label="导入曲谱"
              onClick={handleOpenImport}
            >
              <Download size={18} />
              <span>导入</span>
            </button>
          </div>
          <div className="rail-spacer" />
          <button
            className={`rail-button ${activeTool === 'sound' ? 'active' : ''}`}
            title="声音设置"
            aria-label="声音设置"
            aria-pressed={activeTool === 'sound'}
            onClick={() => handleToolSelect('sound')}
          >
            <Volume2 size={18} />
            <span>声音</span>
          </button>
          <button
            className={`rail-button ${activeTool === 'more' ? 'active' : ''}`}
            title="更多工具"
            aria-label="更多工具"
            aria-pressed={activeTool === 'more'}
            onClick={() => handleToolSelect('more')}
          >
            <span className="rail-settings-icon">•••</span>
            <span>更多</span>
          </button>
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImportScore(event)}
            tabIndex={-1}
          />
          <input
            ref={sampleInputRef}
            className="visually-hidden"
            type="file"
            accept=".wav,.mp3,.ogg,audio/wav,audio/mpeg,audio/ogg"
            multiple
            onChange={(event) => void handleImportGuitarSamples(event)}
            tabIndex={-1}
          />
        </aside>

        <section className="score-stage">
          <div className="score-toolbar">
            <div className="toolbar-cluster">
              <button
                className="icon-button"
                title="撤销"
                aria-label="撤销"
                onClick={handleUndo}
                disabled={!history.length}
              >
                <Undo2 size={17} />
              </button>
              <button
                className="icon-button"
                title="重做"
                aria-label="重做"
                onClick={handleRedo}
                disabled={!future.length}
              >
                <Redo2 size={17} />
              </button>
              <span className="toolbar-divider" />
              <button
                className="toolbar-select"
                title="拍号"
                aria-label="拍号"
              >
                <span>4/4</span>
                <ChevronDown size={13} />
              </button>
              <button
                className="toolbar-select"
                title="调弦"
                aria-label="调弦"
              >
                <span>标准调弦</span>
                <ChevronDown size={13} />
              </button>
            </div>
            <div className="toolbar-cluster toolbar-right">
              <span className="zoom-label">100%</span>
              <button className="icon-button" title="重置缩放" aria-label="重置缩放">
                <RotateCcw size={16} />
              </button>
              <button className="icon-button" title="导出" aria-label="导出">
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="score-scroll">
            <div className="score-paper">
              <div className="score-meta">
                <div>
                  <div className="score-paper-kicker">ORIGINAL SCORE</div>
                  <h1>{score.title}</h1>
                  <p>{score.artist || 'Aster Lane'} · Electric guitar</p>
                </div>
                <div className="score-meta-right">
                  <span>♩ = {tempo}</span>
                  <span>4/4</span>
                  <span>Standard tuning</span>
                </div>
              </div>

              <div className="notation-wrap">
                <div className="staff-gutter">
                  <span className="clef">𝄞</span>
                  <span className="tab-mark">TAB</span>
                </div>
                <div className="measure-list">
                  {score.measures.map((measure, measureIndex) => (
                    <MeasureGrid
                      key={measure.id}
                      measure={measure}
                      measureIndex={measureIndex}
                      selectedCell={selectedCell}
                      playhead={playhead}
                      onCellClick={handleScoreCellClick}
                    />
                  ))}
                </div>
              </div>

              <div className="score-footer">
                <button className="add-measure-button" onClick={handleAddMeasure}>
                  <Plus size={14} />
                  添加小节
                </button>
                <span>第 1 页 · {score.measures.length} 小节</span>
              </div>
            </div>
          </div>

          <div className="transport">
            <div className="transport-left">
              <button
                className="transport-button"
                title="回到开头"
                aria-label="回到开头"
                onClick={handleStopPlayback}
              >
                <SkipBack size={18} />
              </button>
              <button
                className="transport-play"
                title={isPlaying ? '暂停' : '播放'}
                aria-label={isPlaying ? '暂停' : '播放'}
                onClick={handleTogglePlayback}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button
                className="transport-button"
                title="停止"
                aria-label="停止"
                onClick={handleStopPlayback}
              >
                <Square size={15} fill="currentColor" />
              </button>
              <span className="transport-divider" />
              <div className="transport-progress">
                <div className="transport-progress-fill" style={{ width: isPlaying ? '32%' : '0%' }} />
              </div>
              <span className="transport-time">
                {String(playhead.measureIndex + 1).padStart(2, '0')}:{String(playhead.beatIndex + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="transport-center">
              <span className="tempo-caption">速度</span>
              <button className="tempo-stepper" onClick={() => setTempo((value) => Math.max(40, value - 4))} aria-label="降低速度">
                −
              </button>
              <span className="tempo-value">{tempo}</span>
              <button className="tempo-stepper" onClick={() => setTempo((value) => Math.min(240, value + 4))} aria-label="提高速度">
                +
              </button>
              <span className="bpm-label">BPM</span>
            </div>
            <div className="transport-right">
              <button className="metronome-toggle active">
                <span className="metronome-icon">♩</span>
                节拍器
              </button>
              <span className="transport-divider" />
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
              <div className="volume-track">
                <div
                  className="volume-fill"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <aside className={`inspector ${isInspectorOpen ? 'open' : ''}`}>
          <div className="inspector-header">
            <div>
              <span className="inspector-kicker">工具检查器</span>
              <h2>{toolTitles[activeTool]}</h2>
            </div>
            <button
              className="icon-button inspector-close"
              title="关闭检查器"
              aria-label="关闭检查器"
              onClick={() => setIsInspectorOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {(activeTool === 'select' || activeTool === 'note') && (
            <>
              <div className="inspector-section">
                <div className="selection-summary">
                  <div className="selection-badge">
                    {selectedCell ? `M${selectedCell.measureIndex + 1}` : '—'}
                  </div>
                  <div>
                    <strong>
                      {selectedCell
                        ? `${selectedCell.beatIndex + 1} 拍 · ${stringNames[selectedCell.stringIndex]}`
                        : '选择一个音符'}
                    </strong>
                    <span>
                      {selectedNote
                        ? '当前选中'
                        : activeTool === 'note'
                          ? '点击谱面即可输入空弦音'
                          : '选择工具不会创建新音符'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="inspector-section">
                <div className="field-label-row">
                  <label htmlFor="fret-select">品位</label>
                  <span className="field-hint">0–24</span>
                </div>
                <select
                  id="fret-select"
                  className="inspector-select"
                  value={selectedNote?.fret ?? 0}
                  onChange={(event) =>
                    handleFretChange(Number(event.target.value))
                  }
                  disabled={!selectedCell}
                >
                  {fretOptions.map((fret) => (
                    <option key={fret} value={fret}>
                      {fret === 0 ? '0 · 空弦' : `${fret} 品`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="inspector-section">
                <div className="field-label-row">
                  <span className="field-label">音符与技巧</span>
                  <span className="field-hint">Palette</span>
                </div>
                <div className="technique-grid">
                  {techniques.map((technique) => (
                    <button
                      key={technique.value}
                      className={`technique-button ${selectedNote?.technique === technique.value ? 'active' : ''}`}
                      onClick={() => handleTechniqueChange(technique.value)}
                      disabled={!selectedCell}
                      title={technique.label}
                    >
                      <strong>{technique.glyph}</strong>
                      <span>{technique.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="inspector-section muted-section">
                <div className="field-label-row">
                  <span className="field-label">快捷动作</span>
                </div>
                <div className="quick-actions">
                  <button onClick={handleDeleteNote} disabled={!selectedNote}>
                    <span>删除音符</span>
                    <kbd>⌫</kbd>
                  </button>
                  <button onClick={handleAddMeasure}>
                    <span>添加小节</span>
                    <kbd>+</kbd>
                  </button>
                </div>
              </div>

              <div className="inspector-tip">
                <div className="tip-icon">
                  <WandSparkles size={16} />
                </div>
                <div>
                  <strong>AI 改谱助手</strong>
                  <p>选中一段小节后，可以让 AI 帮你简化指法、改节奏或配和弦。</p>
                  <button>
                    开始对话 <span>↗</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTool === 'chord' && (
            <>
              <div className="inspector-section">
                <div className="selection-summary">
                  <div className="selection-badge">
                    {selectedCell ? `M${selectedCell.measureIndex + 1}` : '—'}
                  </div>
                  <div>
                    <strong>
                      {selectedCell
                        ? `${selectedCell.beatIndex + 1} 拍${currentBeat?.chord ? ` · ${currentBeat.chord}` : ''}`
                        : '先选择一个拍位'}
                    </strong>
                    <span>
                      {currentBeat?.chord
                        ? '当前拍位已显示和弦标记'
                        : '预设会替换该拍位上的全部音符'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="inspector-section muted-section">
                <div className="field-label-row">
                  <span className="field-label">常用和弦</span>
                  <span className="field-hint">Standard</span>
                </div>
                <div className="chord-grid">
                  {chordPresets.map((chord) => (
                    <button
                      key={chord.name}
                      onClick={() => handleApplyChord(chord.name, chord.notes)}
                      disabled={!selectedCell}
                    >
                      <strong>{chord.name}</strong>
                      <span>{chord.notes.length} 弦</span>
                    </button>
                  ))}
                </div>
                {selectedCell && currentBeat?.chord && (
                  <div className="chord-current">
                    <ChordDiagram chord={currentBeat.chord} />
                    <div>
                      <strong>{currentBeat.chord}</strong>
                      <span>已显示在谱面上</span>
                    </div>
                    <button
                      className="chord-clear-button"
                      onClick={handleClearChord}
                      title="清除和弦标记"
                      aria-label="清除和弦标记"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTool === 'sound' && (
            <>
              <div className="inspector-section">
                <div className="field-label-row">
                  <label htmlFor="volume-range">主音量</label>
                  <span className="field-hint">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
                <input
                  id="volume-range"
                  className="volume-range"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(volume * 100)}
                  onChange={(event) => {
                    setVolume(Number(event.target.value) / 100);
                    setIsMuted(false);
                  }}
                />
              </div>
              <div className="inspector-section">
                <div className="field-label-row">
                  <span className="field-label">采样音源</span>
                  <span className="field-hint">{guitarSamples.length} 个</span>
                </div>
                <button
                  className="sample-import-button"
                  onClick={handleOpenSampleImport}
                  disabled={isImportingSamples}
                >
                  <Upload size={15} />
                  {isImportingSamples ? '正在解析音源…' : '导入音源文件'}
                </button>
                <p className="sample-import-hint">
                  支持 WAV、MP3、OGG，例如 string-6-fret-0.wav
                </p>
                {guitarSamples.length > 0 && (
                  <div className="sample-list">
                    {guitarSamples.map((sample) => (
                      <div className="sample-list-item" key={sample.id}>
                        <div>
                          <strong>{sample.name}</strong>
                          <span>
                            {sample.stringIndex + 1} 弦 · {sample.fret} 品
                          </span>
                        </div>
                        <button
                          className="sample-delete-button"
                          title={`删除 ${sample.name}`}
                          aria-label={`删除 ${sample.name}`}
                          onClick={() => void handleDeleteGuitarSample(sample)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="inspector-section muted-section">
                <div className="quick-actions">
                  <button onClick={() => setIsMuted((value) => !value)}>
                    <span>{isMuted ? '取消静音' : '静音'}</span>
                    {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                  <button
                    onClick={() => void playBeat(currentBeat)}
                    disabled={!currentBeat}
                  >
                    <span>试听当前拍位</span>
                    <Play size={13} />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTool === 'more' && (
            <>
              <div className="inspector-section">
                <div className="document-stats">
                  <div>
                    <span>小节</span>
                    <strong>{score.measures.length}</strong>
                  </div>
                  <div>
                    <span>速度</span>
                    <strong>{tempo}</strong>
                  </div>
                </div>
              </div>
              <div className="inspector-section muted-section">
                <div className="field-label-row">
                  <span className="field-label">文件操作</span>
                </div>
                <div className="quick-actions">
                  <button onClick={handleOpenImport}>
                    <span>导入 JSON 曲谱</span>
                    <Download size={14} />
                  </button>
                  <button onClick={handleExportScore}>
                    <span>导出 JSON 曲谱</span>
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {(isLoading || notice) && (
        <div className="loading-toast" role="status">
          {isLoading ? '正在连接工作区…' : notice}
        </div>
      )}
    </main>
  );
}

interface MeasureGridProps {
  measure: ScoreMeasure;
  measureIndex: number;
  selectedCell: CellPosition | null;
  playhead: { measureIndex: number; beatIndex: number };
  onCellClick: (position: CellPosition) => void;
}

function MeasureGrid({
  measure,
  measureIndex,
  selectedCell,
  playhead,
  onCellClick,
}: MeasureGridProps) {
  const chordChanges = measure.beats.reduce<Array<{ beatIndex: number; chord: string }>>(
    (changes, beat, beatIndex) => {
      if (beat.chord && changes.at(-1)?.chord !== beat.chord) {
        changes.push({ beatIndex, chord: beat.chord });
      }
      return changes;
    },
    [],
  );

  return (
    <section className="measure-grid" aria-label={`${measureIndex + 1} 小节 TAB`}>
      <div className="measure-number">{measureIndex + 1}</div>
      <div className="chord-row" aria-label={`${measureIndex + 1} 小节和弦`}>
        {chordChanges.map(({ beatIndex, chord }) => (
          <div
            className="chord-slot"
            key={`${measure.id}-${beatIndex}-chord`}
            style={{ gridColumn: beatIndex + 1 }}
          >
            <span className="chord-name">{chord}</span>
            <ChordDiagram chord={chord} />
          </div>
        ))}
      </div>
      <div className="rhythm-row" aria-hidden="true">
        {measure.beats.map((beat, beatIndex) => (
          <div className="rhythm-cell" key={`${beat.id}-rhythm`}>
            {beat.notes.length > 0 && (
              <>
                <span className="rhythm-notehead" />
                <span className="rhythm-stem" />
                {beatIndex % 4 !== 0 && <span className="rhythm-flag" />}
              </>
            )}
          </div>
        ))}
        {Array.from({ length: 4 }, (_, groupIndex) => {
          const hasNotes = measure.beats
            .slice(groupIndex * 4, groupIndex * 4 + 4)
            .some((beat) => beat.notes.length > 0);
          return hasNotes ? (
            <Fragment key={`${measure.id}-beam-${groupIndex}`}>
              <span
                className="rhythm-beam rhythm-beam-first"
                style={{ gridColumn: `${groupIndex * 4 + 1} / span 4` }}
              />
              <span
                className="rhythm-beam rhythm-beam-second"
                style={{ gridColumn: `${groupIndex * 4 + 1} / span 4` }}
              />
            </Fragment>
          ) : null;
        })}
      </div>
      <div className="measure-beat-lines" aria-hidden="true">
        {[4, 8, 12].map((beatIndex) => (
          <span
            className="measure-beat-line"
            key={`${measure.id}-bar-${beatIndex}`}
            style={{ gridColumn: beatIndex + 1 }}
          />
        ))}
      </div>
      <div className="tab-system">
        {Array.from({ length: 6 }, (_, stringIndex) => (
          <span className="tab-string-line" key={`${measure.id}-line-${stringIndex}`} />
        ))}
        <div className="tab-grid">
          {measure.beats.map((beat, beatIndex) =>
            Array.from({ length: 6 }, (_, stringIndex) => {
              const note = beat.notes.find((item) => item.stringIndex === stringIndex);
              const isSelected =
                selectedCell?.measureIndex === measureIndex &&
                selectedCell.beatIndex === beatIndex &&
                selectedCell.stringIndex === stringIndex;
              const isPlaying =
                playhead.measureIndex === measureIndex &&
                playhead.beatIndex === beatIndex;
              return (
                <button
                  className={`string-cell ${isSelected ? 'selected' : ''} ${isPlaying ? 'playing' : ''} ${note ? 'has-note' : ''}`}
                  key={`${beat.id}-${stringIndex}`}
                  style={{ gridColumn: beatIndex + 1, gridRow: stringIndex + 1 }}
                  onClick={() =>
                    onCellClick({
                      measureIndex,
                      beatIndex,
                      stringIndex,
                    })
                  }
                  aria-label={`${measureIndex + 1} 小节，第 ${beatIndex + 1} 个十六分音符，第 ${stringIndex + 1} 弦`}
                >
                  {note && (
                    <span className="note-value">
                      {getTabNoteSymbol(note)}
                    </span>
                  )}
                  {note && note.technique !== 'normal' && note.technique !== 'dead-note' && (
                    <span className="note-technique">{getTechniqueGlyph(note.technique)}</span>
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>
    </section>
  );
}

function getTabNoteSymbol(note: { fret: number; technique: NoteTechnique }): string {
  return note.technique === 'dead-note' ? 'x' : String(note.fret);
}

function getTechniqueGlyph(technique: NoteTechnique): string {
  return (
    techniques.find((option) => option.value === technique)?.glyph ??
    techniques[0].glyph
  );
}

function ChordDiagram({ chord }: { chord: string }) {
  const preset = chordPresets.find((item) => item.name === chord);
  if (!preset) {
    return <span className="chord-fallback">{chord}</span>;
  }

  return (
    <span className="mini-chord-diagram" aria-label={`${chord} 和弦指法`}>
      <span className="chord-nut" />
      {Array.from({ length: 6 }, (_, stringIndex) => (
        <span
          className="chord-string"
          key={`${chord}-string-${stringIndex}`}
          style={{ left: `${stringIndex * 20}%` }}
        />
      ))}
      {Array.from({ length: 5 }, (_, fretIndex) => (
        <span
          className="chord-fret"
          key={`${chord}-fret-${fretIndex}`}
          style={{ top: `${(fretIndex + 1) * 20}%` }}
        />
      ))}
      {preset.notes.map((note) => (
        <span
          className={`chord-dot ${note.fret === 0 ? 'open' : ''}`}
          key={`${chord}-${note.stringIndex}`}
          style={{
            left: `${note.stringIndex * 20}%`,
            top: `${note.fret === 0 ? -8 : Math.min(note.fret, 4) * 20 + 4}%`,
          }}
        >
          {note.fret === 0 ? '○' : ''}
        </span>
      ))}
    </span>
  );
}

/**
 * 从约定文件名中识别琴弦和品位。
 *
 * @param fileName 音源文件名
 * @returns 识别到的内部琴弦索引和品位，无法识别时返回 null
 */
function inferGuitarSamplePosition(
  fileName: string,
): { stringIndex: number; fret: number } | null {
  const normalizedName = fileName
    .toLowerCase()
    .replace(/\.(wav|mp3|ogg)$/i, '');
  const chineseMatch = normalizedName.match(
    /([1-6])弦(?:[-_ ]*(\d{1,2})(?:品)?)?/,
  );
  const stringMatch = normalizedName.match(
    /(?:string|str|s)[-_ ]*([1-6])(?:[-_ ]+(?:(?:fret|f)[-_ ]*)?(\d{1,2}))?/,
  );
  const compactMatch = normalizedName.match(
    /^([1-6])[-_ ]+(?:(?:fret|f)[-_ ]*)?(\d{1,2})(?:[-_ ]|$)/,
  );
  const matchedPosition = chineseMatch ?? stringMatch ?? compactMatch;

  if (matchedPosition) {
    const stringIndex = Number(matchedPosition[1]) - 1;
    const fret = Number(matchedPosition[2] ?? 0);
    return fret <= 24 ? { stringIndex, fret } : null;
  }

  const pitchMatch = normalizedName.match(
    /(?:^|[-_ ])(e2|a2|d3|g3|b3|e4)(?:$|[-_ ])/,
  );
  if (!pitchMatch) {
    return null;
  }

  const openStringByPitch: Record<string, number> = {
    e4: 0,
    b3: 1,
    g3: 2,
    d3: 3,
    a2: 4,
    e2: 5,
  };
  const stringIndex = openStringByPitch[pitchMatch[1]];
  return stringIndex === undefined ? null : { stringIndex, fret: 0 };
}

/**
 * 按低音弦到高音弦、低品位到高品位排列采样。
 *
 * @param samples 待排序采样
 * @returns 排序后的新数组
 */
function sortGuitarSamples(
  samples: GuitarSampleRecord[],
): GuitarSampleRecord[] {
  return [...samples].sort(
    (firstSample, secondSample) =>
      secondSample.stringIndex - firstSample.stringIndex ||
      firstSample.fret - secondSample.fret,
  );
}

/**
 * 查找同一根弦上距离目标品位最近的采样，避免超过一个八度的大幅变调。
 *
 * @param samples 已导入采样
 * @param stringIndex 目标琴弦索引
 * @param fret 目标品位
 * @returns 可用于目标音符的最近采样
 */
function findClosestGuitarSample(
  samples: GuitarSampleRecord[],
  stringIndex: number,
  fret: number,
): GuitarSampleRecord | undefined {
  return samples
    .filter(
      (sample) =>
        sample.stringIndex === stringIndex &&
        Math.abs(sample.fret - fret) <= 12,
    )
    .sort(
      (firstSample, secondSample) =>
        Math.abs(firstSample.fret - fret) -
        Math.abs(secondSample.fret - fret),
    )[0];
}

/**
 * 解码并缓存浏览器音源，同一个采样并发请求时复用正在执行的解码任务。
 *
 * @param audioContext 当前音频上下文
 * @param sample 待解码采样
 * @param sampleBufferCache 已完成解码缓存
 * @param sampleDecodePromises 正在执行的解码任务
 * @returns 解码后的音频缓冲
 */
async function decodeGuitarSample(
  audioContext: AudioContext,
  sample: GuitarSampleRecord,
  sampleBufferCache: Map<string, AudioBuffer>,
  sampleDecodePromises: Map<string, Promise<AudioBuffer>>,
): Promise<AudioBuffer> {
  const cachedBuffer = sampleBufferCache.get(sample.id);
  if (cachedBuffer) {
    return cachedBuffer;
  }

  const pendingDecode = sampleDecodePromises.get(sample.id);
  if (pendingDecode) {
    return pendingDecode;
  }

  const decodePromise = audioContext
    .decodeAudioData(sample.audioData.slice(0))
    .then((audioBuffer) => {
      sampleBufferCache.set(sample.id, audioBuffer);
      return audioBuffer;
    })
    .finally(() => sampleDecodePromises.delete(sample.id));
  sampleDecodePromises.set(sample.id, decodePromise);
  return decodePromise;
}

/**
 * 生成带自然衰减的拨弦缓冲，使用短噪声激励和延迟反馈模拟琴弦振动。
 *
 * @param audioContext 当前音频上下文
 * @param frequency 琴弦基频
 * @param duration 音符持续时间
 * @param damping 每次反馈的衰减系数
 * @param brightness 初始拨弦噪声的明亮程度
 * @returns 可交给 AudioBufferSourceNode 播放的单声道缓冲
 */
function createPluckedStringBuffer(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  damping: number,
  brightness: number,
): AudioBuffer {
  const sampleRate = audioContext.sampleRate;
  const sampleCount = Math.ceil(sampleRate * duration);
  const delayLength = Math.max(2, Math.round(sampleRate / frequency));
  const audioBuffer = audioContext.createBuffer(1, sampleCount, sampleRate);
  const samples = audioBuffer.getChannelData(0);
  let previousNoise = 0;

  for (let sampleIndex = 0; sampleIndex < delayLength; sampleIndex += 1) {
    const noise = Math.random() * 2 - 1;
    const pickPosition =
      Math.sin((Math.PI * (sampleIndex + 1)) / (delayLength + 1)) ** 0.55;
    samples[sampleIndex] =
      (noise * brightness + previousNoise * (1 - brightness)) * pickPosition;
    previousNoise = noise;
  }

  for (
    let sampleIndex = delayLength;
    sampleIndex < sampleCount;
    sampleIndex += 1
  ) {
    const delayedSample = samples[sampleIndex - delayLength] ?? 0;
    const previousDelayedSample =
      samples[sampleIndex - delayLength - 1] ?? delayedSample;
    samples[sampleIndex] =
      damping * 0.5 * (delayedSample + previousDelayedSample);
  }

  return audioBuffer;
}

function updateScoreNote(
  score: ScoreDocument,
  position: CellPosition,
  fret: number,
): ScoreDocument {
  return {
    ...score,
    measures: score.measures.map((measure, measureIndex) =>
      measureIndex !== position.measureIndex
        ? measure
        : {
            ...measure,
            beats: measure.beats.map((beat, beatIndex) =>
              beatIndex !== position.beatIndex
                ? beat
                : {
                    ...beat,
                    notes: [
                      ...beat.notes.filter(
                        (note) => note.stringIndex !== position.stringIndex,
                      ),
                      {
                        stringIndex: position.stringIndex,
                        fret,
                        technique: 'normal',
                      },
                    ],
                  },
            ),
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

function updateScoreTechnique(
  score: ScoreDocument,
  position: CellPosition,
  technique: NoteTechnique,
): ScoreDocument {
  return {
    ...score,
    measures: score.measures.map((measure, measureIndex) =>
      measureIndex !== position.measureIndex
        ? measure
        : {
            ...measure,
            beats: measure.beats.map((beat, beatIndex) =>
              beatIndex !== position.beatIndex
                ? beat
                : {
                    ...beat,
                    notes: beat.notes.some(
                      (note) => note.stringIndex === position.stringIndex,
                    )
                      ? beat.notes.map((note) =>
                          note.stringIndex === position.stringIndex
                            ? { ...note, technique }
                            : note,
                        )
                      : [
                          ...beat.notes,
                          {
                            stringIndex: position.stringIndex,
                            fret: 0,
                            technique,
                          },
                        ],
                  },
            ),
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

function removeScoreNote(
  score: ScoreDocument,
  position: CellPosition,
): ScoreDocument {
  return {
    ...score,
    measures: score.measures.map((measure, measureIndex) =>
      measureIndex !== position.measureIndex
        ? measure
        : {
            ...measure,
            beats: measure.beats.map((beat, beatIndex) =>
              beatIndex !== position.beatIndex
                ? beat
                : {
                    ...beat,
                    notes: beat.notes.filter(
                      (note) => note.stringIndex !== position.stringIndex,
                    ),
                  },
            ),
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

function updateScoreBeatNotes(
  score: ScoreDocument,
  measureIndex: number,
  beatIndex: number,
  notes: ReadonlyArray<{ stringIndex: number; fret: number }>,
  chord?: string,
): ScoreDocument {
  return {
    ...score,
    measures: score.measures.map((measure, currentMeasureIndex) =>
      currentMeasureIndex !== measureIndex
        ? measure
        : {
            ...measure,
            beats: measure.beats.map((beat, currentBeatIndex) =>
              currentBeatIndex !== beatIndex
                ? beat
                  : {
                    ...beat,
                    ...(chord ? { chord } : {}),
                    notes: notes.map((note) => ({
                      ...note,
                      technique: 'normal',
                    })),
                  },
            ),
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

function updateScoreBeatChord(
  score: ScoreDocument,
  position: CellPosition,
  chord: string | undefined,
): ScoreDocument {
  return {
    ...score,
    measures: score.measures.map((measure, measureIndex) =>
      measureIndex !== position.measureIndex
        ? measure
        : {
            ...measure,
            beats: measure.beats.map((beat, beatIndex) =>
              beatIndex !== position.beatIndex
                ? beat
                : {
                    ...beat,
                    ...(chord ? { chord } : { chord: undefined }),
                  },
            ),
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

function isScoreDocument(value: unknown): value is ScoreDocument {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const score = value as Record<string, unknown>;
  if (
    typeof score.id !== 'string' ||
    typeof score.title !== 'string' ||
    typeof score.artist !== 'string' ||
    typeof score.tempo !== 'number' ||
    score.timeSignature !== '4/4' ||
    !Array.isArray(score.tuning) ||
    !Array.isArray(score.measures)
  ) {
    return false;
  }

  return score.measures.every((measure) => {
    if (!measure || typeof measure !== 'object') {
      return false;
    }
    const scoreMeasure = measure as Record<string, unknown>;
    if (
      typeof scoreMeasure.id !== 'string' ||
      !Array.isArray(scoreMeasure.beats)
    ) {
      return false;
    }
      return scoreMeasure.beats.every((beat) => {
      if (!beat || typeof beat !== 'object') {
        return false;
      }
      const scoreBeat = beat as Record<string, unknown>;
      if (
        typeof scoreBeat.id !== 'string' ||
        !Array.isArray(scoreBeat.notes) ||
        (scoreBeat.chord !== undefined && typeof scoreBeat.chord !== 'string')
      ) {
        return false;
      }
      return scoreBeat.notes.every((note) => {
        if (!note || typeof note !== 'object') {
          return false;
        }
        const scoreNote = note as Record<string, unknown>;
        return (
          typeof scoreNote.stringIndex === 'number' &&
          scoreNote.stringIndex >= 0 &&
          scoreNote.stringIndex < 6 &&
          typeof scoreNote.fret === 'number' &&
          scoreNote.fret >= 0 &&
          scoreNote.fret <= 24 &&
          techniques.some(
            (technique) => technique.value === scoreNote.technique,
          )
        );
      });
    });
  });
}
