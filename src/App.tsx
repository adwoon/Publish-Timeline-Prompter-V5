/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { 
  Plus, 
  Minus,
  Trash2, 
  Clock, 
  Camera, 
  Sparkles,
  Copy,
  Check,
  Type as TypeIcon,
  Layout,
  Download,
  Upload,
  Wand2,
  Loader2,
  XCircle,
  Languages,
  Image as ImageIcon,
  Home,
  Layers,
  Library,
  Settings,
  User,
  Search,
  Maximize,
  Move,
  Zap,
  Scissors,
  Sun,
  CircleDot,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Scene, HistoryItem, DEFAULT_SCENES, formatPrompt, formatSentencePrompt, CAMERA_SHOT_OPTIONS, CAMERA_SHOT_GROUPS, CUT_TAG_REGEX } from './types';

const TRANSLATIONS = {
  ko: {
    title: "Timeline Prompter",
    export: "프로젝트 내보내기",
    import: "프로젝트 불러오기",
    concept: "전체 컨셉",
    duration: "총 길이",
    conceptPlaceholder: "AI가 장면을 구성할 수 있도록 영상의 핵심 스토리, 피사체, 또는 기초 정보를 입력하세요 (예: 황폐해진 미래 도시를 탐험하는 고독한 로봇의 여정, 숲속에서 발견된 신비로운 유적...)",
    aiGenerate: "AI로 장면 자동 생성",
    copied: "복사됨!",
    timelineTitle: "타임라인 장면",
    clearAll: "모든 장면 삭제",
    addScene: "장면 추가",
    time: "시간",
    cameraShots: "카메라 샷",
    scenePlaceholder: "장면에 대한 상세한 묘사를 입력하세요...",
    addImage: "이미지 추가",
    removeImage: "이미지 삭제",
    previewTitle: "생성된 프롬프트",
    sentencePreviewTitle: "문장형 프롬프트",
    fullOutput: "전체 출력",
    scenesCount: (n: number, t: number) => `${n}개 장면 • 총 ${t}초`,
    copy: "복사",
    copyScene: "장면 복사",
    copiedScene: "복사됨!",
    shotOptions: "샷 옵션 설정",
    compression: "압축률",
    compress: "AI로 압축",
    compressing: "압축 중...",
    originalLength: "원본 길이",
    compressedLength: "압축 후 길이",
    confirmClear: "모든 장면을 삭제하시겠습니까?",
    alertNoConcept: "먼저 컨셉을 입력해주세요.",
    alertError: "AI 생성 중 오류가 발생했습니다.",
    subjects: "피사체",
    environment: "환경",
    mood: "분위기",
    translating: "번역 중...",
    refinePrompt: "맥락 수정 제안",
    refinePlaceholder: "예: 전체적으로 더 어두운 분위기로 바꿔줘, 주인공의 감정 묘사를 더 강조해줘...",
    aiRefine: "AI로 맥락 수정",
    refining: "수정 중...",
    history: "히스토리",
    settings: "설정",
    sceneCount: "장면 수",
    creativity: "창의성 (Temperature)",
    creativityDesc: "높을수록 더 창의적이고 예측 불가능한 결과를 생성합니다.",
    scenes: "장면 목록",
    allHistory: "전체 히스토리",
    event: "이벤트",
    fromTo: "프로젝트/컨셉",
    amount: "장면 수",
    value: "길이/형식",
    date: "생성일",
    aiPrompt: (concept: string, duration: number, shots: string[], subjects?: string, environment?: string, mood?: string) => `컨셉: "${concept}", 총 ${duration}초.
        ${subjects ? `기존 피사체 정보: "${subjects}"` : ''}
        ${environment ? `기존 환경 정보: "${environment}"` : ''}
        ${mood ? `기존 분위기 정보: "${mood}"` : ''}
        
        제공된 예시의 구조와 스타일을 엄격히 따라 JSON을 생성할 것. 특히 캐릭터와 상황에 대한 묘사를 매우 구체적으로 작성해야 함.

        [예시 스타일 참고]
        - SUBJECTS: 캐릭터의 외형, 복장(재질, 광택), 신체적 특징(턱선, 머리모양), 소품, 움직임의 리듬(멈춤->폭발->고정)을 극도로 상세히 묘사.
        - ENVIRONMENT: 구체적인 장소 설정, 소품의 배치(전경/배경), 조명(색온도, 방향), 대기 효과(연기, 열기 왜곡, 먼지) 등 시각적 요소를 구체화.
        - MOOD: 감정적 상태, 긴장감의 정도, 전체적인 연출의 우아함이나 거칠기 등 톤앤매너를 명시.
        - TIMELINE: 
          1. 카메라 기법 명시: [Extreme close-up], [POV], [Match move tracking], [Stabilized POV] 등.
          2. 동작의 물리적 디테일: "손가락이 테두리를 톡 친다", "증기가 렌즈를 덮으며 페이드아웃" 등 감각적이고 구체적인 액션.
          3. 인과관계: 이전 장면의 소품이나 상태가 다음 장면에 어떻게 연결되는지 명확히 기술.

        [출력 구조]
        1. 전체 텍스트(subjects + environment + mood + 모든 scenes의 description)의 합이 공백 포함 2500자를 넘지 않도록 간결하면서도 핵심적인 묘사를 유지할 것.
        2. JSON 형식:
        {
          "subjects": "구체적인 캐릭터/피사체 묘사...",
          "environment": "상세한 환경/배경 설정...",
          "mood": "톤앤매너와 분위기...",
          "scenes": [
            { 
              "startTime": 0, 
              "endTime": 2, 
              "actTitle": "장면 제목", 
              "description": "[카메라샷] 구체적인 동작과 감각적 묘사... (주의: 'CUT 1'이나 '0s-2s' 같은 정보는 시스템이 자동 생성하므로 절대 포함하지 말 것)" 
            },
            ...
          ]
        }`
  },
  en: {
    title: "Timeline Prompter",
    export: "Export Project",
    import: "Import Project",
    concept: "Overall Concept",
    duration: "Duration",
    conceptPlaceholder: "Enter the core story, subject, or initial context for the AI to build upon (e.g., A lonely robot's journey exploring a desolate future city, mysterious ruins discovered in a deep forest...)",
    aiGenerate: "Auto-generate scenes with AI",
    copied: "Copied!",
    timelineTitle: "Timeline Segments",
    clearAll: "Clear all scenes",
    addScene: "Add scene",
    time: "Time",
    cameraShots: "Camera Shots",
    scenePlaceholder: "Enter a detailed description for the scene...",
    addImage: "Add Image",
    removeImage: "Remove Image",
    previewTitle: "Generated Prompt",
    sentencePreviewTitle: "Sentence Prompt",
    fullOutput: "Full Output",
    scenesCount: (n: number, t: number) => `${n} Scenes • Total ${t}s`,
    copy: "Copy",
    copyScene: "Copy Scene",
    copiedScene: "Copied!",
    shotOptions: "Shot Options",
    compression: "Compression",
    compress: "Compress with AI",
    compressing: "Compressing...",
    originalLength: "Original Length",
    compressedLength: "Compressed Length",
    confirmClear: "Are you sure you want to delete all scenes?",
    alertNoConcept: "Please enter a concept first.",
    alertError: "An error occurred during AI generation.",
    subjects: "Subjects",
    environment: "Environment",
    mood: "Mood",
    translating: "Translating...",
    refinePrompt: "Refinement Suggestion",
    refinePlaceholder: "e.g., Make the overall mood darker, emphasize the protagonist's emotions more...",
    aiRefine: "Refine with AI",
    refining: "Refining...",
    history: "History",
    settings: "Settings",
    sceneCount: "Scenes",
    creativity: "Creativity (Temperature)",
    creativityDesc: "Higher values produce more creative and unpredictable results.",
    scenes: "Scene List",
    allHistory: "All history",
    event: "Event",
    fromTo: "Project/Concept",
    amount: "Scenes",
    value: "Duration/Format",
    date: "Created At",
    aiPrompt: (concept: string, duration: number, shots: string[], subjects?: string, environment?: string, mood?: string) => `Concept: "${concept}", Total ${duration}s.
        ${subjects ? `Existing Subjects: "${subjects}"` : ''}
        ${environment ? `Existing Environment: "${environment}"` : ''}
        ${mood ? `Existing Mood: "${mood}"` : ''}
 
        Generate JSON strictly following the structure and style of the provided example. Descriptions of characters and situations must be extremely specific.

        [Style Guidelines]
        - SUBJECTS: Describe character appearance, outfit (material, sheen), physical traits (jawline, hairstyle), accessories, and movement rhythm (pause -> burst -> lock) in extreme detail.
        - ENVIRONMENT: Specify exact location, placement of props (foreground/background), lighting (color temperature, direction), and atmospheric effects (smoke, heat distortion, dust).
        - MOOD: Specify emotional state, level of tension, and overall tone (e.g., elegant vs. chaotic).
        - TIMELINE: 
          1. Specify camera techniques: [Extreme close-up], [POV], [Match move tracking], [Stabilized POV], etc.
          2. Physical details of action: "A finger taps the rim", "Steam covers the lens for a fade-out", etc.
          3. Causality: Clearly describe how props or states from the previous scene connect to the next.

        [Output Structure]
        1. Ensure the total length of all text (subjects + environment + mood + all scene descriptions) does not exceed 2500 characters including spaces. Maintain concise but essential visual details.
        2. JSON format:
        {
          "subjects": "Detailed character/subject description...",
          "environment": "Detailed environment/background setting...",
          "mood": "Tone and atmosphere...",
          "scenes": [
            { 
              "startTime": 0, 
              "endTime": 2, 
              "actTitle": "Scene Title", 
              "description": "[Camera Shot] Specific action and sensory description... (Note: NEVER include 'CUT 1' or '0s-2s' in this field; the system will add it automatically)" 
            },
            ...
          ]
        }`
  }
};

const TimeInput = ({ value, onChange, className }: { value: number, onChange: (val: number) => void, className?: string }) => {
  const [localValue, setLocalValue] = useState(Math.round(value).toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalValue(Math.round(value).toString());
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={localValue}
      onChange={(e) => {
        const val = e.target.value;
        setLocalValue(val);
        const parsed = parseInt(val);
        if (!isNaN(parsed) && val === parsed.toString()) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        const parsed = Math.round(parseFloat(localValue));
        if (!isNaN(parsed)) {
          onChange(parsed);
          setLocalValue(parsed.toString());
        } else {
          setLocalValue(Math.round(value).toString());
        }
      }}
      className={className}
    />
  );
};

export default function App() {
  const [lang, setLang] = useState<'ko' | 'en'>('en');
  const t = TRANSLATIONS[lang];

  const [concept, setConcept] = useState('');
  const [subjects, setSubjects] = useState('');
  const [environment, setEnvironment] = useState('');
  const [mood, setMood] = useState('');
  const [conceptImages, setConceptImages] = useState<string[]>([]);
  const [targetDuration, setTargetDuration] = useState(15);
  const [scenes, setScenes] = useState<Scene[]>(() => [
    {
      id: '1',
      startTime: 0,
      endTime: 15,
      cameraShots: [],
      description: "CUT 1 | 0s – 15s | "
    }
  ]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedSentence, setCopiedSentence] = useState(false);
  const [compressionRatio, setCompressionRatio] = useState(100);
  const [compressedSentence, setCompressedSentence] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const conceptRef = useRef<HTMLTextAreaElement>(null);
  const refineRef = useRef<HTMLTextAreaElement>(null);
  const subjectsRef = useRef<HTMLTextAreaElement>(null);
  const environmentRef = useRef<HTMLTextAreaElement>(null);
  const moodRef = useRef<HTMLTextAreaElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'scenes' | 'history' | 'settings'>('home');
  const [temperature, setTemperature] = useState(0.7);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedImages, setSelectedImages] = useState<number[]>([0, 1, 2, 3]);
  const [showCredits, setShowCredits] = useState(false);
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({});
  const skipReset = useRef(false);

  // Auto-expand textareas
  useLayoutEffect(() => {
    const adjustHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
      if (ref.current) {
        ref.current.style.height = '0px';
        const scrollHeight = ref.current.scrollHeight;
        // Add a small buffer to prevent cutting off descenders or borders
        ref.current.style.height = `${scrollHeight + 2}px`;
      }
    };

    adjustHeight(conceptRef);
    adjustHeight(refineRef);
    adjustHeight(subjectsRef);
    adjustHeight(environmentRef);
    adjustHeight(moodRef);

    // Adjust all scene textareas
    const sceneTextareas = document.querySelectorAll('.scene-textarea') as NodeListOf<HTMLTextAreaElement>;
    sceneTextareas.forEach(textarea => {
      // Use a slightly more robust way to calculate height
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > 0) {
        textarea.style.height = `${scrollHeight + 2}px`;
      }
    });
  }, [concept, refinementPrompt, subjects, environment, mood, scenes]);

  // Reset compressed sentence when inputs change to ensure prompt reflects current data
  useEffect(() => {
    // If skipReset is true, it means the change came from translation which already handled compressedSentence
    if (skipReset.current) {
      skipReset.current = false;
      return;
    }
    // Only reset if we're not currently compressing or translating
    if (!isCompressing && !isTranslating) {
      setCompressedSentence(null);
      setCompressionRatio(100);
    }
  }, [concept, subjects, environment, mood, scenes]);

  // Undo/Redo State
  const [undoStack, setUndoStack] = useState<{
    concept: string;
    subjects: string;
    environment: string;
    mood: string;
    scenes: Scene[];
    targetDuration: number;
  }[]>([]);
  const [redoStack, setRedoStack] = useState<{
    concept: string;
    subjects: string;
    environment: string;
    mood: string;
    scenes: Scene[];
    targetDuration: number;
  }[]>([]);
  const isInternalUpdate = useRef(false);

  // Function to save current state to undo stack
  const saveToHistory = useCallback((state: {
    concept: string;
    subjects: string;
    environment: string;
    mood: string;
    scenes: Scene[];
    targetDuration: number;
  }) => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    setUndoStack(prev => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (JSON.stringify(last) === JSON.stringify(state)) return prev;
      }
      const newStack = [...prev, JSON.parse(JSON.stringify(state))];
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setRedoStack([]);
  }, []);

  // Effect to auto-save state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveToHistory({ concept, subjects, environment, mood, scenes, targetDuration });
    }, 800);
    return () => clearTimeout(timer);
  }, [concept, subjects, environment, mood, scenes, targetDuration, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (undoStack.length <= 1) return;

    const current = undoStack[undoStack.length - 1];
    const previous = undoStack[undoStack.length - 2];

    isInternalUpdate.current = true;
    setRedoStack(prev => [...prev, current]);
    setUndoStack(prev => prev.slice(0, -1));

    setConcept(previous.concept);
    setSubjects(previous.subjects);
    setEnvironment(previous.environment);
    setMood(previous.mood);
    setScenes(previous.scenes);
    setTargetDuration(previous.targetDuration);
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];

    isInternalUpdate.current = true;
    setUndoStack(prev => [...prev, next]);
    setRedoStack(prev => prev.slice(0, -1));

    setConcept(next.concept);
    setSubjects(next.subjects);
    setEnvironment(next.environment);
    setMood(next.mood);
    setScenes(next.scenes);
    setTargetDuration(next.targetDuration);
  }, [redoStack]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === 'z';
      const isY = e.key.toLowerCase() === 'y';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && isZ) {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          // Check if we're in an input/textarea - standard undo might conflict
          // but usually we want our app-level undo for the project state
          e.preventDefault();
          handleUndo();
        }
      } else if (isCmdOrCtrl && isY) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const totalDuration = scenes.length > 0 ? Math.round(scenes[scenes.length - 1].endTime) : 0;

  const updateTargetDuration = (val: number) => {
    setTargetDuration(val);
    rescaleTimings(val);
  };

  const cycleDuration = () => {
    const presets = [5, 10, 15, 30, 60];
    const currentIndex = presets.indexOf(targetDuration);
    const nextIndex = (currentIndex + 1) % presets.length;
    const nextTarget = presets[nextIndex];
    updateTargetDuration(nextTarget);
  };

  const toggleImageSelection = (idx: number) => {
    setSelectedImages(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handlePinterestSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    window.open(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };

  const translateContent = async (targetLang: 'ko' | 'en') => {
    if (!concept && !subjects && scenes.every(s => !s.description)) return;
    
    setIsTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate to ${targetLang === 'ko' ? 'Korean (use plain style/평어체)' : 'English'}. Keep JSON structure.
        Translate "concept", "subjects", "environment", "mood", "actTitle", "description", and "compressedSentence" fields.
        
        Data: ${JSON.stringify({ 
          concept, 
          subjects, 
          environment, 
          mood, 
          scenes: scenes.map(s => ({ id: s.id, actTitle: s.actTitle, description: s.description })),
          compressedSentence
        })}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concept: { type: Type.STRING },
              subjects: { type: Type.STRING },
              environment: { type: Type.STRING },
              mood: { type: Type.STRING },
              compressedSentence: { type: Type.STRING, nullable: true },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    actTitle: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["id", "actTitle", "description"]
                }
              }
            },
            required: ["concept", "subjects", "environment", "mood", "scenes"]
          }
        }
      });

      const translated = JSON.parse(response.text || '{}');
      skipReset.current = true;
      if (translated.concept !== undefined) setConcept(translated.concept);
      if (translated.subjects !== undefined) setSubjects(translated.subjects);
      if (translated.environment !== undefined) setEnvironment(translated.environment);
      if (translated.mood !== undefined) setMood(translated.mood);
      if (translated.compressedSentence !== undefined) setCompressedSentence(translated.compressedSentence);
      
      if (translated.scenes) {
        setScenes(prev => prev.map(s => {
          const t = translated.scenes.find((ts: any) => ts.id === s.id);
          return t ? { ...s, actTitle: t.actTitle, description: t.description } : s;
        }));
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const addHistory = (event: string, value: string, amount: number = 1) => {
    const now = new Date();
    const dateStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      event,
      target: concept || "Untitled",
      amount,
      value,
      date: dateStr
    };
    setHistory(prev => [newItem, ...prev].slice(0, 10)); // Keep last 10
  };

  const handleLangChange = (newLang: 'ko' | 'en') => {
    if (newLang === lang) return;
    setLang(newLang);
    translateContent(newLang);
  };

  const toggleSceneOptions = (id: string) => {
    setExpandedScenes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const addScene = () => {
    const lastScene = scenes[scenes.length - 1];
    const startTime = lastScene ? lastScene.endTime : 0;
    const duration = 1;
    const endTime = startTime + duration;
    const newScene: Scene = {
      id: Math.random().toString(36).substr(2, 9),
      startTime,
      endTime,
      actTitle: `Scene ${scenes.length + 1}`,
      cameraShots: [],
      description: "" // renumberCuts will add the initial absolute tag
    };
    const newScenes = [...scenes, newScene];
    setScenes(renumberCuts(newScenes));
  };

  const adjustSceneCount = (delta: number) => {
    if (scenes.length === 0) return;

    if (delta > 0) {
      // Find the longest scene to split
      let longestSceneIdx = 0;
      let maxDuration = 0;
      scenes.forEach((s, idx) => {
        const d = s.endTime - s.startTime;
        if (d > maxDuration) {
          maxDuration = d;
          longestSceneIdx = idx;
        }
      });

      const sceneToSplit = scenes[longestSceneIdx];
      const duration = sceneToSplit.endTime - sceneToSplit.startTime;
      const mid = Math.round(sceneToSplit.startTime + duration / 2);

      const firstHalf: Scene = {
        ...JSON.parse(JSON.stringify(sceneToSplit)),
        id: Math.random().toString(36).substr(2, 9),
        endTime: mid,
        description: sceneToSplit.description
      };

      const secondHalf: Scene = {
        ...JSON.parse(JSON.stringify(sceneToSplit)),
        id: Math.random().toString(36).substr(2, 9),
        startTime: mid,
        actTitle: `${sceneToSplit.actTitle} (Cont.)`,
        description: sceneToSplit.description
      };

      const newScenes = [
        ...scenes.slice(0, longestSceneIdx),
        firstHalf,
        secondHalf,
        ...scenes.slice(longestSceneIdx + 1)
      ];
      setScenes(renumberCuts(newScenes));
    } else if (delta < 0 && scenes.length > 1) {
      // Find the shortest scene to merge with its neighbor
      let shortestSceneIdx = 0;
      let minDuration = Infinity;
      scenes.forEach((s, idx) => {
        const d = s.endTime - s.startTime;
        if (d < minDuration) {
          minDuration = d;
          shortestSceneIdx = idx;
        }
      });

      let newScenes: Scene[] = [];
      if (shortestSceneIdx === 0) {
        // Merge with next
        const merged: Scene = {
          ...scenes[1],
          startTime: scenes[0].startTime,
          description: scenes[0].description + "\n" + scenes[1].description
        };
        newScenes = [merged, ...scenes.slice(2)];
      } else {
        // Merge with previous
        const merged: Scene = {
          ...scenes[shortestSceneIdx - 1],
          endTime: scenes[shortestSceneIdx].endTime,
          description: scenes[shortestSceneIdx - 1].description + "\n" + scenes[shortestSceneIdx].description
        };
        newScenes = [
          ...scenes.slice(0, shortestSceneIdx - 1),
          merged,
          ...scenes.slice(shortestSceneIdx + 1)
        ];
      }
      setScenes(renumberCuts(newScenes));
    }
  };

  const renumberCuts = (currentScenes: Scene[]) => {
    let cutCount = 1;
    let globalTime = 0;

    return currentScenes.map((scene) => {
      let desc = scene.description;
      const sceneStartTime = Math.round(globalTime);
      const sceneDuration = Math.max(1, Math.round((scene.endTime || 5) - (scene.startTime || 0)));
      
      // Regex to find ANY variation of CUT tags or the [CUT] marker
      const brokenTagRegex = /(?:CUT|컷)\s*\d*\s*\|\s*(?![^|]*(?:s|초)\s*[–\-~]\s*[^|]*(?:s|초)\s*\|)/gi;
      const rawCutRegex = /\b(?:CUT|컷)\b\s*\d*\s*/gi;
      const markerRegex = /\[CUT\]/gi;

      // 1. Strip all existing tags to get clean content
      // But we need to keep track of where the user wants NEW cuts
      // We'll replace all variations with a unique marker [NEW_CUT_HERE]
      let processedDesc = desc
        .replace(CUT_TAG_REGEX, '[NEW_CUT_HERE]')
        .replace(brokenTagRegex, '[NEW_CUT_HERE]')
        .replace(rawCutRegex, '[NEW_CUT_HERE]')
        .replace(markerRegex, '[NEW_CUT_HERE]');

      // Split by markers and filter out empty segments
      const segments = processedDesc.split('[NEW_CUT_HERE]')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // If no segments (empty text), provide a default empty one
      const finalSegments = segments.length > 0 ? segments : [""];
      
      // Distribute scene duration among segments
      const segmentDuration = sceneDuration / finalSegments.length;
      let currentScenePos = sceneStartTime;
      
      const newDesc = finalSegments.map((segment, idx) => {
        const startStr = Math.round(currentScenePos).toString();
        const endStr = Math.round(currentScenePos + segmentDuration).toString();
        const tag = `CUT ${cutCount++} | ${startStr}s – ${endStr}s | `;
        currentScenePos += segmentDuration;
        return tag + segment;
      }).join('\n\n');

      const updatedScene = {
        ...scene,
        description: newDesc,
        startTime: Math.round(sceneStartTime),
        endTime: Math.round(sceneStartTime + sceneDuration)
      };
      
      globalTime = updatedScene.endTime;
      return updatedScene;
    });
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    const textarea = document.getElementById(`textarea-${id}`) as HTMLTextAreaElement;
    const isTextareaActive = document.activeElement === textarea;
    const cursorStart = textarea?.selectionStart;
    const cursorEnd = textarea?.selectionEnd;

    let newScenes = [...scenes];
    
    // If startTime or endTime is being updated, we need to rescale the CUT tags in the description
    if (updates.startTime !== undefined || updates.endTime !== undefined) {
      const newStartTime = Math.round(updates.startTime !== undefined ? updates.startTime : scene.startTime);
      const newEndTime = Math.round(updates.endTime !== undefined ? updates.endTime : scene.endTime);
      const newDuration = Math.max(1, newEndTime - newStartTime);
      const oldDuration = Math.max(1, Math.round(scene.endTime - scene.startTime));
      const factor = newDuration / oldDuration;

      let newDesc = scene.description;
      const cutTagRegex = /CUT\s*\d*\s*\|\s*([\d.,]*)\s*s\s*[–\-~]\s*([\d.,]*)\s*s\s*\|/g;
      const parseTime = (s: string) => {
        const val = parseFloat(s.replace(',', '.'));
        return isNaN(val) ? 0 : Math.round(val);
      };
      
      let currentPos = newStartTime;
      newDesc = newDesc.replace(cutTagRegex, (match, p1, p2) => {
        const originalCutDuration = Math.max(1, parseTime(p2) - parseTime(p1));
        const scaledDuration = Math.max(1, Math.round(originalCutDuration * factor));
        const startStr = Math.round(currentPos).toString();
        const endStr = Math.round(currentPos + scaledDuration).toString();
        const replacement = `CUT | ${startStr}s – ${endStr}s |`; // renumberCuts will fix the number
        currentPos += scaledDuration;
        return replacement;
      });

      updates.description = newDesc;
      updates.endTime = Math.round(currentPos); // Ensure it matches the calculated end
    }

    newScenes = newScenes.map(s => s.id === id ? { ...s, ...updates } : s);
    const renumbered = renumberCuts(newScenes);
    setScenes(renumbered);

    // Restore cursor position after state update ONLY if textarea was active
    if (isTextareaActive && textarea && cursorStart !== undefined && cursorEnd !== undefined) {
      setTimeout(() => {
        textarea.setSelectionRange(cursorStart, cursorEnd);
      }, 0);
    }
  };

  const insertShot = (sceneId: string, shot: string) => {
    const textarea = document.getElementById(`textarea-${sceneId}`) as HTMLTextAreaElement;
    const scene = scenes.find(s => s.id === sceneId);
    if (!textarea || !scene) return;

    const shotTag = `[${shot}]`;
    const text = scene.description;
    
    let newText = text;
    let newPos = 0;
    
    if (text.includes(shotTag)) {
      // Toggle off: Remove the shot tag if already present
      newText = text.replace(shotTag, '').trim();
    } else {
      // Toggle on: Insert the shot tag at cursor position
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      newText = text.substring(0, start) + shotTag + text.substring(end);
      newPos = start + shotTag.length;
    }

    // Clear the automatic cameraShots list for this scene as requested
    updateScene(sceneId, { 
      description: newText,
      cameraShots: [] 
    });

    // Refocus and set cursor if we inserted a new tag
    if (newPos > 0) {
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const insertCut = (sceneId: string) => {
    const textarea = document.getElementById(`textarea-${sceneId}`) as HTMLTextAreaElement;
    const scene = scenes.find(s => s.id === sceneId);
    if (!textarea || !scene) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = scene.description;

    // Insert "CUT" with a leading newline if not at the start
    const prefix = (start > 0 && text[start - 1] !== '\n') ? '\n\n' : '';
    const cutTag = `${prefix}CUT `;
    const newText = text.substring(0, start) + cutTag + text.substring(end);
    const newPos = start + cutTag.length;

    const updatedScenes = scenes.map(s => s.id === sceneId ? { ...s, description: newText } : s);
    setScenes(renumberCuts(updatedScenes));

    setTimeout(() => {
      const updatedTextarea = document.getElementById(`textarea-${sceneId}`) as HTMLTextAreaElement;
      if (updatedTextarea) {
        updatedTextarea.focus();
        updatedTextarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const removeScene = (id: string) => {
    if (scenes.length > 1) {
      const newScenes = scenes.filter(s => s.id !== id);
      setScenes(renumberCuts(newScenes));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - conceptImages.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots) as File[];

    filesToUpload.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setConceptImages(prev => {
          if (prev.length >= 4) return prev;
          const newIdx = prev.length;
          setSelectedImages(s => [...s, newIdx]);
          return [...prev, result];
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setConceptImages(prev => prev.filter((_, i) => i !== index));
    setSelectedImages(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const copyToClipboard = () => {
    const prompt = formatPrompt(concept, subjects, environment, mood, scenes, lang);
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    addHistory('Copy', 'Prompt');
    setTimeout(() => setCopied(false), 2000);
  };

  const copySentenceToClipboard = () => {
    const prompt = compressedSentence || formatSentencePrompt(concept, subjects, environment, mood, scenes);
    navigator.clipboard.writeText(prompt);
    setCopiedSentence(true);
    addHistory('Copy', 'Sentence Prompt');
    setTimeout(() => setCopiedSentence(false), 2000);
  };

  const handleCompressPrompt = async () => {
    if (isCompressing) return;
    
    const original = formatSentencePrompt(concept, subjects, environment, mood, scenes);
    if (!original.trim()) return;

    setIsCompressing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const targetLength = Math.min(2500, Math.round(original.length * (compressionRatio / 100)));
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Please compress/summarize the following video generation prompt to approximately ${targetLength} characters (current length: ${original.length} characters). 
        Maintain the core visual details, subjects, and atmosphere. 
        The output should be a single continuous paragraph in ${lang === 'ko' ? 'Korean (use plain style/평어체)' : 'English'}.
        
        PROMPT:
        ${original}`,
        config: {
          temperature: 0.7,
        }
      });

      const result = response.text?.trim();
      if (result) {
        setCompressedSentence(result);
        addHistory('Compress', `${compressionRatio}%`);
      }
    } catch (error) {
      console.error("Compression error:", error);
      alert(t.alertError);
    } finally {
      setIsCompressing(false);
    }
  };

  const resetCompression = () => {
    setCompressedSentence(null);
    setCompressionRatio(100);
  };

  const copyScene = (scene: Scene, index: number) => {
    const actHeader = `ACT ${index + 1}: ${scene.actTitle || 'Untitled Scene'}`;
    const text = `${actHeader}\n\n${scene.description}`;
    navigator.clipboard.writeText(text);
    setCopiedSceneId(scene.id);
    addHistory('Copy', `Scene ${index + 1}`);
    setTimeout(() => setCopiedSceneId(null), 2000);
  };

  const exportProject = () => {
    const data = { 
      concept, 
      subjects, 
      environment, 
      mood, 
      conceptImages, 
      selectedImages, 
      scenes, 
      history, 
      lang,
      targetDuration,
      temperature
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    
    link.download = `Timeline_Prompter_${dateStr}_${timeStr}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addHistory('Export', 'JSON');
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.concept !== undefined) setConcept(data.concept);
        if (data.subjects !== undefined) setSubjects(data.subjects);
        if (data.environment !== undefined) setEnvironment(data.environment);
        if (data.mood !== undefined) setMood(data.mood);
        if (data.conceptImages !== undefined) setConceptImages(data.conceptImages);
        else if (data.conceptImage !== undefined) setConceptImages([data.conceptImage]);
        if (data.selectedImages !== undefined) setSelectedImages(data.selectedImages);
        if (data.scenes !== undefined) setScenes(renumberCuts(data.scenes));
        if (data.history !== undefined) setHistory(data.history);
        if (data.lang !== undefined) setLang(data.lang);
        if (data.targetDuration !== undefined) setTargetDuration(data.targetDuration);
        if (data.temperature !== undefined) setTemperature(data.temperature);
      } catch (err) {
        alert('Invalid project file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearAllScenes = () => {
    if (confirm(t.confirmClear)) {
      const initialScene: Scene = {
        id: '1',
        startTime: 0,
        endTime: targetDuration,
        actTitle: 'Intro',
        cameraShots: [],
        description: `CUT 1 | 0s – ${Math.round(targetDuration)}s | `
      };
      setScenes([initialScene]);
    }
  };

  const handleGenerateAI = async () => {
    if (!concept.trim()) {
      alert(t.alertNoConcept);
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const imageParts = conceptImages
        .filter((_, idx) => selectedImages.includes(idx))
        .map(img => ({
          inlineData: {
            data: img.split(',')[1],
            mimeType: img.split(';')[0].split(':')[1]
          }
        }));

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: {
          role: 'user',
          parts: [
            ...imageParts,
            { text: t.aiPrompt(concept, targetDuration, CAMERA_SHOT_OPTIONS, subjects, environment, mood) }
          ]
        },
        config: {
          systemInstruction: `You are a professional cinematic prompt engineer. Follow the provided example style: high tension, precise physical movements, and sensory details. Respond in ${lang === 'ko' ? 'Korean using plain style (평어체)' : 'English'}. Ensure the output is a valid JSON object matching the requested schema.`,
          temperature: Math.min(temperature, 0.8),
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjects: { type: Type.STRING },
              environment: { type: Type.STRING },
              mood: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    startTime: { type: Type.NUMBER },
                    endTime: { type: Type.NUMBER },
                    actTitle: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["startTime", "endTime", "actTitle", "description"]
                }
              }
            },
            required: ["subjects", "environment", "mood", "scenes"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      if (result.concept !== undefined) setConcept(result.concept);
      if (result.subjects !== undefined) setSubjects(result.subjects);
      if (result.environment !== undefined) setEnvironment(result.environment);
      if (result.mood !== undefined) setMood(result.mood);
      
      if (result.scenes) {
        const scenesWithIds = result.scenes.map((s: any) => ({
          ...s,
          cameraShots: [],
          id: Math.random().toString(36).substr(2, 9)
        }));
        
        // Ensure the generated scenes match the targetDuration
        const rescaled = rescaleTimings(targetDuration, scenesWithIds);
        setScenes(rescaled);
        addHistory('Generate', `${rescaled[rescaled.length - 1]?.endTime || 0}s`, rescaled.length);
      }
    } catch (err) {
      console.error(err);
      alert(t.alertError);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefineAI = async () => {
    if (!refinementPrompt.trim() || isRefining) return;
    setIsRefining(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Replace CUT tags with [CUT] markers before sending to AI to preserve the structure
      const cleanScenes = scenes.map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        actTitle: s.actTitle,
        description: s.description.replace(CUT_TAG_REGEX, '[CUT] ').trim()
      }));

      // Add a timeout to the AI request
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 60000)
      );

      const aiRequest = ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [{
          role: 'user',
          parts: [{
            text: `[Context Refinement Request]
        The user wants to modify the current timeline based on this instruction: "${refinementPrompt}"
        
        [Current State]
        Concept: "${concept}"
        Subjects: "${subjects}"
        Environment: "${environment}"
        Mood: "${mood}"
        Scenes: ${JSON.stringify(cleanScenes)}
        
        [Instructions]
        1. Update the concept, subjects, environment, mood, and scene descriptions to reflect the user's refinement.
        2. CRITICAL: Keep exactly the same number of scenes (${scenes.length} scenes) and the same timing (startTime/endTime).
        3. Maintain the style: high tension, precise physical movements, and sensory details.
        4. Insert camera shots in [Shot Name] format inside descriptions (e.g., "[Close-up] The character's eyes tremble").
        5. Use [CUT] markers to indicate where cuts should occur within a scene. YOU MUST PRESERVE ALL EXISTING [CUT] MARKERS. If a scene description previously had [CUT] markers, the new description MUST also have them in appropriate places.
        6. DO NOT include "CUT | ... |" tags in the description. The system will add them automatically based on your [CUT] markers.
        7. DO NOT repeat the same sentences or phrases. Be concise but descriptive.
        8. CRITICAL: Ensure the total length of all text fields (concept, subjects, environment, mood, and all scene descriptions) does not exceed 2500 characters including spaces.
        9. Return the updated data in JSON format.
        
        [IMPORTANT]
        If you are emphasizing action (e.g., "액션을 강조해줘"), make sure to add more [CUT] markers to create a faster-paced, more dynamic sequence, while keeping the overall scene duration the same.
        
        [Output Structure]
        {
          "concept": "...",
          "subjects": "...",
          "environment": "...",
          "mood": "...",
          "scenes": [
            { "id": "...", "startTime": 0, "endTime": 5, "actTitle": "...", "description": "..." },
            ...
          ]
        }`
          }]
        }],
        config: {
          systemInstruction: `You are a professional cinematic prompt engineer. Refine the existing timeline based on user feedback. Respond in ${lang === 'ko' ? 'Korean using plain style (평어체)' : 'English'}. Ensure the output is a valid JSON object matching the requested schema.`,
          temperature: 0.4,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concept: { type: Type.STRING },
              subjects: { type: Type.STRING },
              environment: { type: Type.STRING },
              mood: { type: Type.STRING },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    startTime: { type: Type.NUMBER },
                    endTime: { type: Type.NUMBER },
                    actTitle: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["id", "actTitle", "description"]
                }
              }
            },
            required: ["concept", "subjects", "environment", "mood", "scenes"]
          }
        }
      });

      const response = await Promise.race([aiRequest, timeoutPromise]) as any;

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const updated = JSON.parse(text);
      if (updated.concept !== undefined) setConcept(updated.concept);
      if (updated.subjects !== undefined) setSubjects(updated.subjects);
      if (updated.environment !== undefined) setEnvironment(updated.environment);
      if (updated.mood !== undefined) setMood(updated.mood);
      
      if (updated.scenes) {
        // More robust scene merging: use AI's returned list but preserve IDs/data where possible
        const newScenes = updated.scenes.map((aiScene: any, idx: number) => {
          // Try matching by ID first, then by index as fallback
          const existingById = scenes.find(s => s.id === aiScene.id);
          const existingByIndex = scenes[idx];
          const existing = existingById || existingByIndex;

          if (existing) {
            return { 
              ...existing, 
              actTitle: aiScene.actTitle || existing.actTitle, 
              description: aiScene.description || existing.description,
              // Preserve timings if AI didn't provide them, or use AI's if provided
              startTime: aiScene.startTime ?? existing.startTime,
              endTime: aiScene.endTime ?? existing.endTime,
              // If AI provided an ID, use it, otherwise keep existing
              id: aiScene.id || existing.id
            };
          }
          
          // If it's a completely new scene (beyond original count)
          const prevScene = idx > 0 ? updated.scenes[idx - 1] : null;
          const start = aiScene.startTime ?? (prevScene?.endTime ?? (scenes[scenes.length - 1]?.endTime || 0));
          const end = aiScene.endTime ?? (start + 5);

          return {
            ...aiScene,
            cameraShots: [],
            id: aiScene.id || Math.random().toString(36).substr(2, 9),
            startTime: start,
            endTime: end
          };
        });
        // renumberCuts will re-apply the CUT tags correctly and ensure continuity
        setScenes(renumberCuts(newScenes));
      }
      setRefinementPrompt('');
      addHistory("Refine", refinementPrompt);
    } catch (err) {
      console.error("Refinement error:", err);
      if (err instanceof Error && err.message === "AI_TIMEOUT") {
        alert("AI response timed out. The server might be busy. Please try again.");
      } else if (err instanceof Error && err.message.includes("tokens limit")) {
        alert("AI response was too long. Please try a simpler refinement request.");
      } else {
        alert(t.alertError);
      }
    } finally {
      setIsRefining(false);
    }
  };

  const rescaleTimings = (newTarget?: number, scenesToScale?: Scene[]) => {
    const targetScenes = scenesToScale ?? scenes;
    if (targetScenes.length === 0) return targetScenes;
    
    const currentTotal = Math.max(...targetScenes.map(s => s.endTime));
    if (currentTotal === 0) return targetScenes;

    const target = newTarget ?? targetDuration;
    const factor = target / currentTotal;
    let cutCount = 1;
    let globalTime = 0;

    const newScenes = targetScenes.map(scene => {
      const sceneStartTime = Math.round(globalTime);
      let newDesc = scene.description;
      
      const cutTagRegex = /CUT\s*\d*\s*\|\s*([\d.,]*)\s*s\s*[–\-~]\s*([\d.,]*)\s*s\s*\|/g;
      const parseTime = (s: string) => {
        const val = parseFloat(s.replace(',', '.'));
        return isNaN(val) ? 0 : Math.round(val);
      };
      
      let currentPos = sceneStartTime;
      const matches = Array.from(newDesc.matchAll(cutTagRegex));
      
      if (matches.length > 0) {
        newDesc = newDesc.replace(cutTagRegex, (match, p1, p2) => {
          const originalDuration = Math.max(1, parseTime(p2) - parseTime(p1));
          const scaledDuration = Math.max(1, Math.round(originalDuration * factor));
          const startStr = Math.round(currentPos).toString();
          const endStr = Math.round(currentPos + scaledDuration).toString();
          const replacement = `CUT ${cutCount++} | ${startStr}s – ${endStr}s |`;
          currentPos += scaledDuration;
          return replacement;
        });
      } else {
        // Handle scene without CUT tags - scale its overall duration
        const originalSceneDuration = Math.max(1, Math.round(scene.endTime - scene.startTime));
        const scaledSceneDuration = Math.max(1, Math.round(originalSceneDuration * factor));
        currentPos = sceneStartTime + scaledSceneDuration;
      }

      const updatedScene = {
        ...scene,
        description: newDesc,
        startTime: Math.round(sceneStartTime),
        endTime: Math.round(currentPos)
      };
      
      globalTime = updatedScene.endTime;
      return updatedScene;
    });

    const finalScenes = renumberCuts(newScenes);
    if (!scenesToScale) {
      setScenes(finalScenes);
    }
    return finalScenes;
  };

  return (
    <div className="flex min-h-screen bg-app-bg text-white font-sans selection:bg-indigo-100/30">
      {/* Sidebar */}
      <aside className="w-24 flex flex-col items-center py-8 border-r border-white/5 bg-app-bg/50 backdrop-blur-xl sticky top-0 h-screen z-50">
        <div className="mb-12">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-app-bg font-black text-xl shadow-lg shadow-white/10">
            TP
          </div>
        </div>
        
        <nav className="flex-1 flex flex-col gap-8">
          <button 
            onClick={() => setActiveView('home')}
            className={`p-3 rounded-2xl transition-all ${activeView === 'home' ? 'bg-white text-app-bg shadow-lg shadow-white/10' : 'text-text-secondary hover:text-white hover:bg-white/10'}`}
          >
            <Home className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('scenes')}
            className={`p-3 rounded-2xl transition-all ${activeView === 'scenes' ? 'bg-white text-app-bg shadow-lg shadow-white/10' : 'text-text-secondary hover:text-white hover:bg-white/10'}`}
          >
            <Layers className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={`p-3 rounded-2xl transition-all ${activeView === 'history' ? 'bg-white text-app-bg shadow-lg shadow-white/10' : 'text-text-secondary hover:text-white hover:bg-white/10'}`}
          >
            <Library className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('settings')}
            className={`p-3 rounded-2xl transition-all ${activeView === 'settings' ? 'bg-white text-app-bg shadow-lg shadow-white/10' : 'text-text-secondary hover:text-white hover:bg-white/10'}`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-6 relative">
          <AnimatePresence>
            {showCredits && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute left-24 ml-4 bottom-0 bg-white text-app-bg px-6 py-4 rounded-2xl shadow-2xl whitespace-nowrap z-[100] border border-white/10"
              >
                <p className="text-sm font-bold">Created by LYU, Have a Goodtime :)</p>
                <div className="absolute left-[-4px] bottom-4 w-3 h-3 bg-white rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setShowCredits(!showCredits)}
            className="w-12 h-12 rounded-full border-2 border-accent/30 transition-all hover:scale-110 active:scale-95 flex items-center justify-center bg-white/5 text-accent"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 px-12 py-8 flex items-center justify-between bg-app-bg/80 backdrop-blur-xl">
          <div className="flex items-center gap-8">
            <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/10 relative">
              <button 
                onClick={() => handleLangChange('ko')}
                className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${lang === 'ko' ? 'bg-accent text-app-bg shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                한국어
              </button>
              <button 
                onClick={() => handleLangChange('en')}
                className={`px-6 py-2 text-xs font-bold rounded-full transition-all ${lang === 'en' ? 'bg-accent text-app-bg shadow-lg' : 'text-text-secondary hover:text-white'}`}
              >
                English
              </button>
              {isTranslating && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                  <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{t.translating}</span>
                </div>
              )}
            </div>
            
            <form onSubmit={handlePinterestSearch} className="relative group">
              <button 
                type="submit"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center hover:scale-110 transition-transform"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png" 
                  alt="Pinterest" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </button>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Pinterest for inspiration..."
                className="pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm outline-none focus:border-white/20 transition-all w-80 placeholder:text-text-secondary"
              />
            </form>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button 
                onClick={exportProject}
                className="p-3 text-text-secondary hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10"
                title={t.export}
              >
                <Upload className="w-5 h-5" />
              </button>
              <label className="p-3 text-text-secondary hover:text-white hover:bg-white/5 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-white/10" title={t.import}>
                <Download className="w-5 h-5" />
                <input type="file" accept=".json" onChange={importProject} className="hidden" />
              </label>
            </div>
          </div>
        </header>

        <main className="px-12 pb-12 space-y-12">
          {activeView === 'home' && (
            <>
              {/* Concept & Global Settings Section */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 bg-card-bg card-rounded border border-white/5 p-6 sm:p-10 shadow-2xl relative overflow-hidden group flex flex-col min-h-[450px] sm:min-h-[600px] lg:min-h-0">
              <div className="absolute top-0 right-0 p-10 opacity-20 group-hover:opacity-40 transition-opacity">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold tracking-tight">{t.concept}</h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{t.duration}</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={targetDuration}
                        onChange={(e) => updateTargetDuration(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-10 text-xs font-bold bg-transparent outline-none text-center border-b border-white/10 focus:border-accent transition-colors"
                      />
                      <div className="flex items-center gap-1.5">
                        {[5, 10, 15].map(d => (
                          <button
                            key={d}
                            onClick={() => updateTargetDuration(d)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                              targetDuration === d 
                                ? 'bg-accent text-app-bg shadow-lg shadow-accent/20' 
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative flex flex-col gap-3 sm:gap-6">
                <textarea 
                  ref={conceptRef}
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full text-base sm:text-2xl font-bold bg-transparent border-none outline-none placeholder:text-white/10 resize-none leading-tight tracking-tight"
                  placeholder={t.conceptPlaceholder}
                  rows={1}
                />
                
                <div className="space-y-3 sm:space-y-6">
                  {/* Refinement Prompt Section - Moved up */}
                {scenes.length > 0 && (
                  <div className="pt-3 sm:pt-6 border-t border-white/5 space-y-2 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.refinePrompt}</label>
                    </div>
                    <div className="relative group/refine">
                      <textarea 
                        ref={refineRef}
                        value={refinementPrompt}
                        onChange={(e) => setRefinementPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleRefineAI();
                          }
                        }}
                        placeholder={t.refinePlaceholder}
                        className="w-full min-h-[48px] sm:min-h-[80px] p-3 sm:p-5 bg-white/[0.07] border border-white/20 rounded-2xl sm:rounded-[24px] text-xs sm:text-sm focus:border-accent/50 focus:bg-white/[0.1] transition-all resize-none leading-relaxed outline-none placeholder:text-white/10"
                        rows={1}
                      />
                      <div className="absolute bottom-3 right-3">
                        <button
                          onClick={handleRefineAI}
                          disabled={isRefining || !refinementPrompt.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white hover:bg-accent hover:text-app-bg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-[10px] active:scale-95"
                        >
                          {isRefining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {isRefining ? t.refining : t.aiRefine}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Global Context Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 pt-3 sm:pt-6">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.subjects}</label>
                    </div>
                    <textarea 
                      ref={subjectsRef}
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      placeholder="Character details..."
                      className="w-full min-h-[48px] sm:min-h-[100px] p-3 sm:p-4 bg-white/[0.07] border border-white/20 rounded-2xl sm:rounded-3xl text-[10px] sm:text-[11px] focus:border-accent/50 focus:bg-white/[0.1] transition-all resize-none leading-relaxed outline-none"
                      rows={1}
                    />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.environment}</label>
                    </div>
                    <textarea 
                      ref={environmentRef}
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      placeholder="Setting, lighting..."
                      className="w-full min-h-[48px] sm:min-h-[100px] p-3 sm:p-4 bg-white/[0.07] border border-white/20 rounded-2xl sm:rounded-3xl text-[10px] sm:text-[11px] focus:border-accent/50 focus:bg-white/[0.1] transition-all resize-none leading-relaxed outline-none"
                      rows={1}
                    />
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                      <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t.mood}</label>
                    </div>
                    <textarea 
                      ref={moodRef}
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      placeholder="Tone, rhythm..."
                      className="w-full min-h-[48px] sm:min-h-[100px] p-3 sm:p-4 bg-white/[0.07] border border-white/20 rounded-2xl sm:rounded-3xl text-[10px] sm:text-[11px] focus:border-accent/50 focus:bg-white/[0.1] transition-all resize-none leading-relaxed outline-none"
                      rows={1}
                    />
                  </div>
                </div>

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleGenerateAI}
                      disabled={isGenerating}
                      className="flex items-center gap-3 px-8 py-4 rounded-full bg-accent text-app-bg hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black text-sm shadow-xl shadow-accent/10 active:scale-95"
                    >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                      {isGenerating ? 'GENERATING...' : 'AI MAGIC GENERATE'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              {/* Featured Card Style Preview */}
              <div className="bg-card-bg card-rounded border border-white/5 overflow-hidden shadow-2xl group relative aspect-[4/5]">
                <div className="absolute inset-0 bg-gradient-to-t from-app-bg via-transparent to-transparent z-10 pointer-events-none" />
                
                {conceptImages.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <label className="flex flex-col items-center gap-4 cursor-pointer group/upload">
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center group-hover/upload:bg-accent group-hover/upload:text-app-bg transition-all duration-500">
                        <Plus className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-bold text-text-secondary group-hover/upload:text-white transition-colors uppercase tracking-widest">
                        {lang === 'ko' ? '이미지 추가' : 'Add Images'}
                      </span>
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className={`absolute inset-0 grid gap-0.5 ${
                    conceptImages.length === 1 ? 'grid-cols-1' : 
                    conceptImages.length === 2 ? 'grid-cols-2' : 
                    conceptImages.length === 3 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-2 grid-rows-2'
                  }`}>
                    {conceptImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className={`relative overflow-hidden cursor-pointer group/img ${
                          conceptImages.length === 3 && idx === 0 ? 'row-span-2' : ''
                        }`}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.trash-btn')) return;
                          toggleImageSelection(idx);
                        }}
                      >
                        <img 
                          src={img} 
                          alt={`Preview ${idx}`} 
                          className={`w-full h-full object-cover transition-all duration-700 ${
                            selectedImages.includes(idx) ? 'opacity-60 scale-100' : 'opacity-20 scale-95 grayscale'
                          } group-hover/img:scale-105`}
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Selection Indicator */}
                        <div className={`absolute top-4 left-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedImages.includes(idx) 
                            ? 'bg-accent border-accent text-app-bg' 
                            : 'bg-black/40 border-white/40 text-transparent'
                        }`}>
                          <Check className="w-4 h-4" />
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="trash-btn absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-all hover:bg-red-500/40 z-30"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="absolute inset-0 z-20 p-10 flex flex-col pointer-events-none">
                  <div className="flex items-center justify-between mb-auto pointer-events-auto">
                    <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-auto">
                      <span className="text-[10px] font-bold tracking-wide">{lang === 'ko' ? 'Key 이미지' : 'Key Image'}</span>
                      <Check className="w-3 h-3 text-blue-400 fill-blue-400" />
                    </div>
                    <div className="flex flex-col gap-2">
                      {conceptImages.length > 0 && conceptImages.length < 4 && (
                        <label className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-white/10 transition-all cursor-pointer">
                          <Plus className="w-5 h-5" />
                          <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                        </label>
                      )}
                      {conceptImages.length > 0 && (
                        <button 
                          onClick={() => setConceptImages([])}
                          className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-red-400/20 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pointer-events-auto">
                    {isEditingTitle ? (
                      <input 
                        autoFocus
                        type="text"
                        value={concept}
                        onChange={(e) => setConcept(e.target.value)}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                        className="text-3xl font-black leading-tight bg-white/10 border border-white/20 rounded-xl px-4 py-1 outline-none w-full text-white"
                        placeholder="Project Title..."
                      />
                    ) : (
                      <h3 
                        onClick={() => setIsEditingTitle(true)}
                        className="text-3xl font-black leading-tight truncate cursor-pointer hover:text-accent transition-colors"
                      >
                        {concept || "New Project"} <span className="text-accent">#{scenes.length}</span>
                      </h3>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 group/dur">
                        <button 
                          onClick={cycleDuration}
                          className="flex items-center gap-2 hover:bg-white/5 p-1 rounded-lg transition-all"
                          title="Cycle Duration Preset"
                        >
                          <Clock className={`w-4 h-4 ${Math.abs(totalDuration - targetDuration) > 0.05 ? 'text-red-400' : 'text-accent'} group-hover/dur:animate-spin`} />
                        </button>
                        <div className="flex flex-col items-start">
                          <span className="text-[8px] text-text-secondary font-bold uppercase tracking-widest">
                            {Math.abs(totalDuration - targetDuration) > 0.05 ? 'Sync Required' : 'Duration'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{Math.round(totalDuration)}s / {targetDuration}s</span>
                            {Math.abs(totalDuration - targetDuration) > 0.05 && (
                              <button 
                                onClick={() => rescaleTimings()}
                                className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full hover:bg-accent/30 transition-all font-bold"
                              >
                                Fit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={exportProject}
                        className="flex-1 flex items-center justify-center gap-3 bg-white/5 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-white/10 transition-all active:scale-95 border border-white/10"
                      >
                        <Download className="w-4 h-4" />
                        <span>{t.export}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline Section */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight">{t.timelineTitle}</h2>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-1 rounded-full border border-white/10">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{scenes.length} Scenes</span>
                  <div className="w-1 h-1 rounded-full bg-accent" />
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Total {Math.round(totalDuration)}s</span>
                </div>
                
                {/* Reference Thumbnails */}
                {conceptImages.length > 0 && (
                  <div className="flex items-center gap-1.5 pl-4 border-l border-white/10">
                    <span className="text-[8px] font-bold text-text-secondary uppercase tracking-[0.2em] mr-2">Refs</span>
                    {conceptImages.map((img, idx) => (
                      <div 
                        key={idx}
                        className={`w-8 h-8 rounded-lg border overflow-hidden transition-all ${
                          selectedImages.includes(idx) ? 'border-accent opacity-100' : 'border-white/10 opacity-30 grayscale'
                        }`}
                      >
                        <img src={img} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mr-1">{t.sceneCount}</span>
                  <button 
                    onClick={() => adjustSceneCount(-1)}
                    className="p-1 hover:bg-white/10 rounded-md transition-all text-text-secondary disabled:opacity-30"
                    disabled={scenes.length <= 1}
                    title="Decrease scene count (redistribute duration)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-5 text-center">{scenes.length}</span>
                  <button 
                    onClick={() => adjustSceneCount(1)}
                    className="p-1 hover:bg-white/10 rounded-md transition-all text-text-secondary"
                    title="Increase scene count (redistribute duration)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button 
                  onClick={clearAllScenes}
                  className="flex items-center gap-2 px-6 py-2 text-xs font-bold text-text-secondary hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  {t.clearAll}
                </button>
                <button 
                  onClick={addScene}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-app-bg text-sm font-bold rounded-full hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {t.addScene}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <AnimatePresence mode="popLayout">
                {scenes.map((scene, index) => (
                  <motion.div
                    key={scene.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl hover:border-white/10 transition-all group relative"
                  >
                    <div className="flex gap-10">
                      <div className="flex flex-col items-center gap-6">
                        <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-text-secondary group-hover:bg-white group-hover:text-app-bg group-hover:border-white transition-all shadow-lg">
                          {(index + 1).toString().padStart(2, '0')}
                        </div>
                        <div className="flex-1 w-px bg-white/5 group-hover:bg-white/10 transition-colors" />
                      </div>

                      <div className="flex-1 space-y-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-6">
                            <div className="flex items-start gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 flex-1">
                              <span className="text-[11px] text-text-secondary font-black uppercase tracking-[0.2em] opacity-50 mt-1">ACT</span>
                              <textarea 
                                value={scene.actTitle || ''}
                                onChange={(e) => updateScene(scene.id, { actTitle: e.target.value })}
                                placeholder="Scene Title..."
                                className="flex-1 bg-transparent outline-none text-xs font-bold focus:text-accent transition-all placeholder:text-white/10 resize-none scene-textarea"
                                rows={1}
                              />
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10">
                              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{t.time}</span>
                              <div className="flex items-center gap-3 text-xs font-mono font-bold">
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => updateScene(scene.id, { startTime: Math.max(0, scene.startTime - 1) })}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                  >
                                    -
                                  </button>
                                  <TimeInput 
                                    value={scene.startTime}
                                    onChange={(val) => updateScene(scene.id, { startTime: val })}
                                    className="w-12 bg-transparent outline-none text-center border-b border-white/10 focus:border-accent transition-colors"
                                  />
                                  <button 
                                    onClick={() => updateScene(scene.id, { startTime: scene.startTime + 1 })}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-white/20">→</span>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => updateScene(scene.id, { endTime: Math.max(scene.startTime + 1, scene.endTime - 1) })}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                  >
                                    -
                                  </button>
                                  <TimeInput 
                                    value={scene.endTime}
                                    onChange={(val) => updateScene(scene.id, { endTime: val })}
                                    className="w-12 bg-transparent outline-none text-center border-b border-white/10 focus:border-accent transition-colors"
                                  />
                                  <button 
                                    onClick={() => updateScene(scene.id, { endTime: scene.endTime + 1 })}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-[10px] text-text-secondary font-normal ml-2">SEC</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeScene(scene.id)}
                            className="p-3 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                            <button 
                              onClick={() => toggleSceneOptions(scene.id)}
                              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/5 transition-all text-text-secondary hover:text-white group"
                            >
                              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-accent/20 group-hover:text-accent transition-all">
                                <Camera className="w-4 h-4" />
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-widest">{t.shotOptions}</span>
                              {expandedScenes[scene.id] ? (
                                <ChevronUp className="w-4 h-4 opacity-50" />
                              ) : (
                                <ChevronDown className="w-4 h-4 opacity-50" />
                              )}
                            </button>

                            <div className="flex items-center gap-4 pr-2">
                              <div className="w-px h-4 bg-white/10 mx-2" />
                              <button
                                onClick={() => insertCut(scene.id)}
                                className="flex items-center gap-3 px-6 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-black hover:bg-accent hover:text-app-bg transition-all shadow-lg shadow-accent/5 uppercase tracking-widest group"
                              >
                                <Scissors className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                Split Cut
                              </button>
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedScenes[scene.id] && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="space-y-4 pt-2 pb-6 px-4 bg-white/[0.02] rounded-3xl border border-white/5">
                                  {CAMERA_SHOT_GROUPS.map((group, idx) => (
                                    <div key={group.category} className="flex items-start gap-4">
                                      <div className="pt-1.5 shrink-0 opacity-40">
                                        {idx === 0 && <User className="w-4 h-4" />}
                                        {idx === 1 && <Move className="w-4 h-4" />}
                                        {idx === 2 && <Camera className="w-4 h-4" />}
                                        {idx === 3 && <Sun className="w-4 h-4" />}
                                        {idx === 4 && <CircleDot className="w-4 h-4" />}
                                        {idx === 5 && <Zap className="w-4 h-4" />}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {group.options.map(shot => (
                                          <button
                                            key={shot}
                                            onClick={() => insertShot(scene.id, shot)}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                                              scene.description.includes(`[${shot}]`)
                                                ? 'bg-white border-white text-app-bg shadow-lg shadow-white/10'
                                                : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:bg-white/10'
                                            }`}
                                          >
                                            {shot}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="relative">
                          <textarea 
                            id={`textarea-${scene.id}`}
                            value={scene.description}
                            onChange={(e) => updateScene(scene.id, { description: e.target.value })}
                            className="w-full bg-white/5 p-8 rounded-[2rem] border border-transparent focus:border-white/10 focus:bg-white/10 outline-none text-base text-white placeholder:text-white/10 resize-none min-h-[160px] leading-relaxed transition-all shadow-inner scene-textarea"
                            placeholder={t.scenePlaceholder}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Prompt Preview Section (Updated to match the new style) */}
          <section className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <TypeIcon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{t.previewTitle}</h2>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Ready for AI Generation</p>
                </div>
              </div>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-3 px-8 py-4 bg-accent text-app-bg text-sm font-bold rounded-full hover:bg-accent-hover transition-all shadow-xl shadow-accent/5 active:scale-95"
              >
                <Copy className="w-4 h-4" />
                {copied ? t.copied : t.copy}
              </button>
            </div>

            <div className="bg-black/40 rounded-[2rem] border border-white/5 p-8 shadow-inner">
              <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed selection:bg-accent/30">
                {formatPrompt(concept, subjects, environment, mood, scenes, lang)}
              </pre>
            </div>

            <div className="mt-10 pt-10 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">System Active</span>
              </div>
              <div className="text-xs font-mono font-bold text-accent">
                {scenes.length}P / {scenes[scenes.length - 1]?.endTime || 0}S
              </div>
            </div>
          </section>

          {/* Sentence Prompt Section */}
          <section className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{t.sentencePreviewTitle}</h2>
                  <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Natural Language Output</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {compressedSentence && (
                  <button 
                    onClick={resetCompression}
                    className="px-6 py-2 text-xs font-bold text-text-secondary hover:text-white transition-all"
                  >
                    Reset
                  </button>
                )}
                <button 
                  onClick={copySentenceToClipboard}
                  className="flex items-center gap-3 px-8 py-4 bg-accent text-app-bg text-sm font-bold rounded-full hover:bg-accent-hover transition-all shadow-xl shadow-accent/5 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  {copiedSentence ? t.copied : t.copy}
                </button>
              </div>
            </div>

            <div className="mb-8 p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest min-w-[80px]">{t.compression}</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={compressionRatio}
                    onChange={(e) => setCompressionRatio(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent"
                  />
                  <span className="text-xs font-mono font-bold text-accent min-w-[40px] text-right">{compressionRatio}%</span>
                </div>
                <button
                  onClick={handleCompressPrompt}
                  disabled={isCompressing || compressionRatio === 100}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white hover:bg-white/20 rounded-full text-[10px] font-bold transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
                >
                  {isCompressing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {isCompressing ? t.compressing : t.compress}
                </button>
              </div>

              <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-text-secondary font-bold uppercase tracking-tighter">{t.originalLength}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${formatSentencePrompt(concept, subjects, environment, mood, scenes).length >= 2500 ? 'text-red-400' : ''}`}>
                      {formatSentencePrompt(concept, subjects, environment, mood, scenes).length} chars
                    </span>
                    {formatSentencePrompt(concept, subjects, environment, mood, scenes).length >= 2500 && (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Truncated</span>
                    )}
                  </div>
                </div>
                {compressedSentence && (
                  <>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-accent font-bold uppercase tracking-tighter">{t.compressedLength}</span>
                      <span className="text-xs font-mono font-bold text-accent">{compressedSentence.length} chars</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-black/40 rounded-[2rem] border border-white/5 p-8 shadow-inner relative group">
              <div className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed selection:bg-accent/30">
                {compressedSentence || formatSentencePrompt(concept, subjects, environment, mood, scenes)}
              </div>
              {compressedSentence && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-accent/20 text-accent rounded-full text-[9px] font-bold uppercase tracking-widest border border-accent/20">
                  Compressed
                </div>
              )}
            </div>
          </section>

          {/* History / Preview Table Style Section */}
          <section className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-bold tracking-tight">{t.history}</h2>
              <div className="flex items-center gap-8">
                <button className="text-xs font-bold text-white border-b-2 border-accent pb-1">{t.allHistory}</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">
                    <th className="text-left pb-6">{t.event}</th>
                    <th className="text-left pb-6">{t.fromTo}</th>
                    <th className="text-center pb-6">{t.amount}</th>
                    <th className="text-right pb-6">{t.value}</th>
                    <th className="text-right pb-6">{t.date}</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-secondary italic">
                        No history yet. Start by generating a prompt!
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 last:border-0 group hover:bg-white/5 transition-all">
                        <td className="py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              row.event === 'Generate' ? 'bg-accent' : 
                              row.event === 'Export' ? 'bg-emerald-400' : 'bg-indigo-400'
                            }`} />
                            {row.event}
                          </div>
                        </td>
                        <td className="py-6">
                          <div className="text-text-secondary group-hover:text-white transition-colors whitespace-pre-wrap leading-relaxed" title={row.target}>
                            {row.target}
                          </div>
                        </td>
                        <td className="py-6 text-center">{row.amount}</td>
                        <td className="py-6 text-right font-bold">{row.value}</td>
                        <td className="py-6 text-right text-text-secondary">{row.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {activeView === 'scenes' && (
        <section className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <Layers className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{t.scenes}</h2>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Project Overview</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveView('home')}
              className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all"
            >
              Back to Editor
            </button>
          </div>
          <div className="space-y-4">
            {scenes.map((scene, idx) => (
              <div key={scene.id} className="p-8 bg-black/20 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent font-black text-xl">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-accent uppercase tracking-widest border border-white/10">
                        {scene.startTime}s - {scene.endTime}s
                      </span>
                      {scene.actTitle && (
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                          {scene.actTitle}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        {scene.cameraShots.map((shot, i) => (
                          <span key={i} className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">
                            {shot}{i < scene.cameraShots.length - 1 ? ' • ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white/80 leading-relaxed whitespace-pre-wrap">
                      {scene.description || "No description provided."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => copyScene(scene, idx)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-text-secondary hover:text-white hover:bg-white/10 transition-all"
                    title={t.copyScene}
                  >
                    <Copy className="w-3 h-3" />
                    {copiedSceneId === scene.id ? t.copiedScene : t.copy}
                  </button>
                  <button 
                    onClick={() => setActiveView('home')}
                    className="p-3 bg-white/5 rounded-xl text-text-secondary hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === 'history' && (
        <section className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <Library className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{t.history}</h2>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Activity Log</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-white/5">
                  <th className="text-left pb-6">{t.event}</th>
                  <th className="text-left pb-6">{t.fromTo}</th>
                  <th className="text-center pb-6">{t.amount}</th>
                  <th className="text-right pb-6">{t.value}</th>
                  <th className="text-right pb-6">{t.date}</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-text-secondary italic">
                      No history yet. Start by generating a prompt!
                    </td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0 group hover:bg-white/5 transition-all">
                      <td className="py-8">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            row.event === 'Generate' ? 'bg-accent' : 
                            row.event === 'Export' ? 'bg-emerald-400' : 'bg-indigo-400'
                          }`} />
                          {row.event}
                        </div>
                      </td>
                      <td className="py-8">
                        <div className="text-text-secondary group-hover:text-white transition-colors whitespace-pre-wrap leading-relaxed" title={row.target}>
                          {row.target}
                        </div>
                      </td>
                      <td className="py-8 text-center">{row.amount}</td>
                      <td className="py-8 text-right font-bold text-accent">{row.value}</td>
                      <td className="py-8 text-right text-text-secondary">{row.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeView === 'settings' && (
        <section className="bg-card-bg card-rounded border border-white/5 p-10 shadow-2xl max-w-3xl">
          <div className="flex items-center gap-4 mb-12">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t.settings}</h2>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Model Configuration</p>
            </div>
          </div>

          <div className="space-y-12">
            <div className="p-8 bg-black/20 rounded-[2rem] border border-white/5 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">{t.creativity}</h3>
                  <p className="text-xs text-text-secondary max-w-md">{t.creativityDesc}</p>
                </div>
                <div className="text-4xl font-black text-accent tabular-nums">
                  {temperature.toFixed(1)}
                </div>
              </div>
              
              <div className="space-y-6">
                <input 
                  type="range" 
                  min="0" 
                  max="1.5" 
                  step="0.1" 
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                  <span className={temperature < 0.5 ? 'text-accent' : ''}>Precise</span>
                  <span className={temperature >= 0.5 && temperature <= 1.0 ? 'text-accent' : ''}>Balanced</span>
                  <span className={temperature > 1.0 ? 'text-accent' : ''}>Creative</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Model</h4>
                <div className="text-sm font-bold text-white">Gemini 3.1 Flash Lite</div>
              </div>
              <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10">
                <h4 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Language</h4>
                <div className="text-sm font-bold text-white">{lang === 'ko' ? '한국어' : 'English'}</div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
      </div>
    </div>
  );
}
