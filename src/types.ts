import { GoogleGenAI } from "@google/genai";

export const CUT_TAG_REGEX = /(?:CUT|컷)\s*\d*\s*\|\s*[\d.,]*\s*(?:s|초)\s*[–\-~]\s*[\d.,]*\s*(?:s|초)\s*\|\s*/gi;

export interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  cameraShots?: string[];
  description: string;
  actTitle?: string;
}

export interface HistoryItem {
  id: string;
  event: string;
  target: string;
  amount: number;
  value: string;
  date: string;
}

export const CAMERA_SHOT_GROUPS = [
  {
    category: "Shot Size",
    options: [
      "Extreme Close-up", "Close-up", "Medium Close-up", "Medium Shot", "Medium Wide Shot", "Wide Shot", "Extreme Wide Shot", 
      "Full Shot", "Two Shot", "Group Shot", "Cowboy Shot", "Macro Shot"
    ]
  },
  {
    category: "Camera Angle",
    options: [
      "Low Angle", "High Angle", "Bird's Eye View", "Worm's Eye View", "Dutch Angle", "Eye Level", 
      "POV Shot", "Over-the-Shoulder", "Ground Level"
    ]
  },
  {
    category: "Movement & Operation",
    options: [
      "Pan", "Tilt", "Zoom-in", "Zoom-out", "Tracking Shot", "Follow Shot", "Dolly Shot", 
      "Hand-held Camera", "Drone FPV Shot", "Crane Shot", "Steadicam", "Gimbal Shot", "Long Take", 
      "Dolly Zoom", "Whip Pan", "Orbit", "Rack Focus", "Action Scene", "Crash Zoom", "360 Degree Shot", "Snorricam"
    ]
  },
  {
    category: "Lighting & Atmosphere",
    options: [
      "Golden Hour", "Blue Hour", "Direct Sunlight", "Overcast", "Moonlight", 
      "Neon Glow", "Harsh Spotlight", "Soft Box", "Rim Lighting", "Backlit", "Silhouette", "Chiaroscuro",
      "Foggy", "Smoky", "Dust Motes", "Volumetric Lighting", "Lens Flare"
    ]
  },
  {
    category: "Lens & Focus",
    options: [
      "Anamorphic", "Wide Angle Lens", "Telephoto Lens", "Fisheye", "Prime Lens", 
      "Deep Focus", "Shallow Depth of Field", "Soft Focus", "Bokeh", "Split Diopter"
    ]
  },
  {
    category: "Timing & Rhythm",
    options: [
      "Slow Motion", "Fast Tempo", "Speed Ramp", "Bullet Time", 
      "Quick-->Slow-->Quick", "Slow-->Quick-->Slow", 
      "Time-lapse", "Hyper-lapse", "Freeze Frame", "Reverse Motion", "Stop Motion", "Motion Blur", "Jump Cut"
    ]
  }
];

export const CAMERA_SHOT_OPTIONS = CAMERA_SHOT_GROUPS.flatMap(g => g.options);

export const DEFAULT_SCENES: Scene[] = [
  {
    id: '1',
    startTime: 0,
    endTime: 1,
    actTitle: 'Intro',
    cameraShots: [],
    description: "CUT 1 | 0s – 1s | "
  }
];

export function formatPrompt(
  concept: string, 
  subjects: string, 
  environment: string, 
  mood: string, 
  scenes: Scene[], 
  lang: 'ko' | 'en' = 'en'
): string {
  let output = `CONCEPT\n${concept}\n\n`;

  if (subjects) output += `SUBJECTS\n${subjects}\n\n`;
  if (environment) output += `ENVIRONMENT\n${environment}\n\n`;
  if (mood) output += `MOOD\n${mood}\n\n`;

  output += `TIMELINE\n`;

  const sceneText = scenes
    .sort((a, b) => a.startTime - b.startTime)
    .map((s, idx) => {
      const actHeader = `ACT ${idx + 1}: ${s.actTitle || 'Untitled Scene'}`;
      return `${actHeader}\n\n${s.description}`;
    })
    .join('\n\n\n');
  
  return `${output}${sceneText}`;
}

export function formatSentencePrompt(
  concept: string, 
  subjects: string, 
  environment: string, 
  mood: string, 
  scenes: Scene[]
): string {
  const parts: string[] = [];
  
  if (concept) parts.push(concept);
  if (subjects) parts.push(subjects);
  if (environment) parts.push(environment);
  if (mood) parts.push(mood);
  
  scenes
    .sort((a, b) => a.startTime - b.startTime)
    .forEach(s => {
      if (s.description) {
        // Remove the "CUT X | Xs - Ys | " prefix if it exists to make it more "sentence-like"
        const cleanDesc = s.description.replace(/^CUT\s+\d+\s+\|\s+\d+s\s+–\s+\d+s\s+\|\s*/i, '').trim();
        if (cleanDesc) parts.push(cleanDesc);
      }
    });
    
  const result = parts.join(' ').replace(/\s+/g, ' ').trim();
  
  // Enforce 2500 character limit as requested
  if (result.length > 2500) {
    return result.substring(0, 2497) + '...';
  }
  
  return result;
}
