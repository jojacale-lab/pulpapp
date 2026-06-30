import React, { useRef, useEffect, useState } from 'react';

export default function SignatureCanvas({ onSave, existingSignature, label = 'Firma del paciente' }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [saved, setSaved] = useState(false);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (existingSignature) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = existingSignature;
      setIsEmpty(false);
    }
  }, [existingSignature]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    setSaved(false);
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setSaved(false);
  };

  const save = () => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(dataUrl);
    setSaved(true);
  };

  return (
    <div>
      <label className="form-label" style={{ marginBottom: 6 }}>{label}</label>
      <div style={{
        border: '2px solid var(--gray-200)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'white',
        cursor: 'crosshair'
      }}>
        <canvas
          ref={canvasRef}
          width={580}
          height={140}
          style={{ display: 'block', width: '100%', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
        <button onClick={clear} className="btn btn-outline btn-sm" type="button">
          🗑 Limpiar
        </button>
        <button
          onClick={save}
          disabled={isEmpty}
          className="btn btn-primary btn-sm"
          type="button"
        >
          ✓ Guardar firma
        </button>
        {saved && (
          <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>
            ✓ Firma guardada
          </span>
        )}
        {!isEmpty && !saved && (
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
            Haz clic en "Guardar firma" para confirmar
          </span>
        )}
      </div>
    </div>
  );
}
