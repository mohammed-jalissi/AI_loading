import { useEffect, useRef } from 'react';

export function useAudioVisualizer(analyser, canvasRef, activeAgent, voiceStatus) {
  const requestRef = useRef();

  useEffect(() => {
    if (!analyser || !canvasRef.current || voiceStatus !== 'listening') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      // Clear canvas when not listening
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      
      // Determine color based on active agent
      if (activeAgent && activeAgent.color) {
        const c = activeAgent.color;
        ctx.strokeStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
      } else {
        ctx.strokeStyle = 'rgb(139, 92, 246)'; // Default purple
      }

      ctx.beginPath();
      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, canvasRef, activeAgent, voiceStatus]);
}
