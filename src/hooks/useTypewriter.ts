import { useState, useEffect } from 'react';

/**
 * Custom hook for simulating typewriter effect.
 * @param text The full text to type out.
 * @param speed The delay (in milliseconds) between typing each character. Defaults to 50.
 * @returns The portion of the text that has been "typed" so far.
 */
export function useTypewriter(text: string, speed: number = 50): string {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset if text changes or is empty
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text || currentIndex >= text.length) {
      return; // Typing finished or no text
    }

    const intervalId = setInterval(() => {
      // Append the next character
      setDisplayedText((prev) => prev + text[currentIndex]);
      setCurrentIndex((prev) => prev + 1);
    }, speed);

    // Cleanup interval on index change, text change, or unmount
    return () => clearInterval(intervalId);
  }, [text, speed, currentIndex]);

  return displayedText;
}
