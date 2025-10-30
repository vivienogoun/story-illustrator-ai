
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { StoryPage } from './types';
import * as geminiService from './services/geminiService';
import { getAudioContext, decodeAudioData } from './utils/audioUtils';

// --- Icon Components ---
const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9.25 2C8.56 2 8 2.56 8 3.25V5.53L5.75 3.28C5.26 2.79 4.47 2.79 3.98 3.28C3.49 3.77 3.49 4.56 3.98 5.05L6.23 7.3H3.95C3.26 7.3 2.7 7.86 2.7 8.55C2.7 9.24 3.26 9.8 3.95 9.8H6.23L3.98 12.05C3.49 12.54 3.49 13.33 3.98 13.82C4.47 14.31 5.26 14.31 5.75 13.82L8 11.57V13.85C8 14.54 8.56 15.1 9.25 15.1C9.94 15.1 10.5 14.54 10.5 13.85V11.57L12.75 13.82C13.24 14.31 14.03 14.31 14.52 13.82C15.01 13.33 15.01 12.54 14.52 12.05L12.27 9.8H14.55C15.24 9.8 15.8 9.24 15.8 8.55C15.8 7.86 15.24 7.3 14.55 7.3H12.27L14.52 5.05C15.01 4.56 15.01 3.77 14.52 3.28C14.03 2.79 13.24 2.79 12.75 3.28L10.5 5.53V3.25C10.5 2.56 9.94 2 9.25 2ZM19 8C17.9 8 17 8.9 17 10C17 11.1 17.9 12 19 12C20.1 12 21 11.1 21 10C21 8.9 20.1 8 19 8ZM15 14C13.9 14 13 14.9 13 16C13 17.1 13.9 18 15 18C16.1 18 17 17.1 17 16C17 14.9 16.1 14 15 14ZM19 18C17.9 18 17 18.9 17 20C17 21.1 17.9 22 19 22C20.1 22 21 21.1 21 20C21 18.9 20.1 18 19 18Z" />
  </svg>
);
const PrevIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
);
const NextIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
);
const ReplayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
);

// --- UI Components ---
const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-amber-50 bg-opacity-90 flex flex-col items-center justify-center z-50">
    <div className="w-16 h-16 border-4 border-t-pink-400 border-yellow-300 rounded-full animate-spin"></div>
    <p className="mt-6 text-lg font-semibold text-pink-600 text-center px-4">{message}</p>
  </div>
);

const WelcomeScreen: React.FC<{ onStartStory: (prompt: string) => void }> = ({ onStartStory }) => {
  const [prompt, setPrompt] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartStory(prompt.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h1 className="text-4xl md:text-6xl font-bold text-pink-500 mb-4">Story Illustrator AI</h1>
      <p className="text-lg md:text-xl text-amber-700 mb-8 max-w-2xl">
        Welcome to a world of imagination! What story shall we create today?
        Tell me an idea, like "a brave little squirrel who wants to fly" or "a magical unicorn who finds a rainbow".
      </p>
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., a cat who builds a rocket to the moon"
            className="flex-grow px-4 py-3 text-amber-800 bg-white rounded-full border-2 border-amber-300 focus:outline-none focus:ring-2 focus:ring-pink-400 transition"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="flex items-center justify-center px-6 py-3 bg-pink-500 text-white font-bold rounded-full shadow-lg hover:bg-pink-600 disabled:bg-pink-300 transition-transform transform hover:scale-105"
          >
            <MagicWandIcon className="w-6 h-6 mr-2" />
            Create Story
          </button>
        </div>
      </form>
    </div>
  );
};

const StoryViewer: React.FC<{
  pages: StoryPage[];
  currentPageIndex: number;
  setCurrentPageIndex: (index: number) => void;
}> = ({ pages, currentPageIndex, setCurrentPageIndex }) => {
  const currentPage = pages[currentPageIndex];
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const playAudio = useCallback(async (audioData: string) => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
    }
    try {
      const audioContext = getAudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const audioBuffer = await decodeAudioData(audioData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      audioSourceRef.current = source;
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  }, []);

  useEffect(() => {
    if (currentPage?.audioData) {
      playAudio(currentPage.audioData);
    }
    return () => {
      audioSourceRef.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, playAudio]);

  if (!currentPage) return null;

  return (
    <div className="flex flex-col h-full p-4 md:p-8">
      <div className="flex-grow flex flex-col lg:flex-row items-center justify-center gap-8">
        <div className="w-full lg:w-1/2 aspect-square bg-white rounded-2xl shadow-xl overflow-hidden flex items-center justify-center border-4 border-amber-200">
          <img src={currentPage.imageUrl} alt="Story illustration" className="w-full h-full object-cover" />
        </div>
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          <p className="text-xl md:text-2xl lg:text-3xl text-amber-800 leading-relaxed bg-amber-100 p-6 rounded-2xl shadow-inner">
            {currentPage.text}
          </p>
          <div className="flex items-center justify-center mt-6 gap-4">
            <button
              onClick={() => setCurrentPageIndex(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              className="p-3 bg-white rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-100 transition"
              aria-label="Previous Page"
            >
              <PrevIcon className="w-8 h-8 text-pink-500" />
            </button>
            <span className="text-lg font-semibold text-amber-700">
              Page {currentPageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
              disabled={currentPageIndex === pages.length - 1}
              className="p-3 bg-white rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-100 transition"
              aria-label="Next Page"
            >
              <NextIcon className="w-8 h-8 text-pink-500" />
            </button>
            <button
              onClick={() => playAudio(currentPage.audioData)}
              className="p-3 bg-white rounded-full shadow-md hover:bg-yellow-100 transition"
              aria-label="Replay Audio"
            >
              <ReplayIcon className="w-8 h-8 text-pink-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---
export default function App() {
  const [storyPages, setStoryPages] = useState<StoryPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateStory = async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setStoryPages([]);
    setCurrentPageIndex(0);
    // Initialize AudioContext on user gesture
    getAudioContext();

    try {
      setLoadingMessage('Our Story Bot is dreaming up your magical tale...');
      const pageTexts = await geminiService.generateStoryPages(prompt);

      if (!pageTexts || pageTexts.length === 0) {
        throw new Error("The story came back empty! Let's try another idea.");
      }

      setLoadingMessage('Magical artists are painting pictures for your story...');
      
      const storyPromises = pageTexts.map((text, index) => 
        Promise.all([
          geminiService.generateImage(text),
          geminiService.generateSpeech(text)
        ]).then(([imageUrl, audioData]) => ({
          id: index,
          text,
          imageUrl: `data:image/jpeg;base64,${imageUrl}`,
          audioData
        }))
      );

      const newStoryPages = await Promise.all(storyPromises);
      setStoryPages(newStoryPages);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Oh no! Our storybook seems to have a torn page. Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStoryPages([]);
    setCurrentPageIndex(0);
    setError(null);
  }

  return (
    <div className="h-screen w-screen font-sans flex flex-col">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      <header className="p-4 bg-amber-100 border-b-2 border-amber-200 flex justify-between items-center">
        <div className="flex items-center">
            <MagicWandIcon className="w-8 h-8 text-pink-500" />
            <h1 className="text-2xl font-bold text-pink-500 ml-2">Story Illustrator AI</h1>
        </div>
        {storyPages.length > 0 && (
            <button onClick={handleReset} className="px-4 py-2 bg-pink-500 text-white font-semibold rounded-full hover:bg-pink-600 transition">
                New Story
            </button>
        )}
      </header>
      <main className="flex-grow overflow-y-auto">
        {error && (
            <div className="p-8 text-center text-red-600">
                <p className="mb-4">{error}</p>
                <button onClick={handleReset} className="px-4 py-2 bg-pink-500 text-white font-semibold rounded-full hover:bg-pink-600 transition">
                    Try Again
                </button>
            </div>
        )}
        {!error && storyPages.length === 0 && <WelcomeScreen onStartStory={handleCreateStory} />}
        {!error && storyPages.length > 0 && (
          <StoryViewer
            pages={storyPages}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
          />
        )}
      </main>
    </div>
  );
}
