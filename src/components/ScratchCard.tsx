import React, { useState, useEffect } from 'react';
import { View, Platform, StyleSheet, Text } from 'react-native';

interface ScratchCardProps {
  amount: number;
  onScratched: () => void;
}

export default function ScratchCard({ amount, onScratched }: ScratchCardProps) {
  // We use an iframe on Web for an authentic HTML5 canvas scratch experience.
  if (Platform.OS === 'web') {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body, html { margin:0; padding:0; width:100%; height:100%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#FFF; font-family:sans-serif; }
        .container { position:relative; width: 100%; height: 100%; max-width: 300px; max-height: 300px; border-radius:30px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.15); }
        .reward-box { position:absolute; top:0; left:0; width:100%; height:100%; background:linear-gradient(135deg, #FEF3C7, #fde047); display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .reward-title { font-size:18px; color:#D97706; font-weight:800; text-transform:uppercase; letter-spacing:1px; }
        .reward-amount { font-size:54px; color:#B45309; font-weight:900; margin:10px 0; }
        canvas { position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; cursor:pointer; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="reward-box">
          <div style="font-size:40px; margin-bottom:10px;">🎁</div>
          <div class="reward-title">You Won</div>
          <div class="reward-amount">₹${amount}</div>
        </div>
        <canvas id="scratchCanvas"></canvas>
      </div>

      <script>
        const canvas = document.getElementById('scratchCanvas');
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let scratchedPixels = 0;
        let totalPixels = 0;
        let isRevealed = false;

        // Cover styling (GPay goldish style)
        function resize() {
          canvas.width = canvas.parentElement.clientWidth;
          canvas.height = canvas.parentElement.clientHeight;
          
          const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          grad.addColorStop(0, '#F59E0B');
          grad.addColorStop(1, '#D4A843');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Pattern overlaid
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('SCRATCH ME', canvas.width/2, canvas.height/2);

          totalPixels = canvas.width * canvas.height;
        }

        window.addEventListener('resize', resize);
        resize();

        function getMousePos(e) {
          const rect = canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          return { x: clientX - rect.left, y: clientY - rect.top };
        }

        function scratch(e) {
          if (!isDrawing || isRevealed) return;
          e.preventDefault();
          const pos = getMousePos(e);
          
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
          ctx.fill();

          checkReveal();
        }

        canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
        canvas.addEventListener('mousemove', scratch);
        window.addEventListener('mouseup', () => isDrawing = false);

        canvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); }, {passive: false});
        canvas.addEventListener('touchmove', scratch, {passive: false});
        window.addEventListener('touchend', () => isDrawing = false);

        function checkReveal() {
          if (isRevealed) return;
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let transparent = 0;
          for (let i = 3; i < imgData.data.length; i += 4) {
            if (imgData.data[i] === 0) transparent++;
          }
          const percent = (transparent / totalPixels) * 100;
          if (percent > 40) { // If 40% scratched, reveal all
            isRevealed = true;
            canvas.style.transition = 'opacity 0.6s ease';
            canvas.style.opacity = '0';
            setTimeout(() => {
              window.parent.postMessage('SCRATCH_COMPLETE', '*');
            }, 600);
          }
        }
      </script>
    </body>
    </html>
    `;

    useEffect(() => {
      const handleMsg = (e: any) => {
        if (e.data === 'SCRATCH_COMPLETE') {
          onScratched();
        }
      };
      window.addEventListener('message', handleMsg);
      return () => window.removeEventListener('message', handleMsg);
    }, [onScratched]);

    return (
      <View style={{ width: 280, height: 280, borderRadius: 30, overflow: 'hidden' }}>
        {React.createElement('iframe', {
          srcDoc: html,
          style: { width: '100%', height: '100%', border: 'none' }
        })}
      </View>
    );
  }

  // Fallback Native Implementation (tap to reveal for simplicity in React Native core without Skia/MaskedView)
  return (
    <View style={s.scBox}>
      <View style={s.scUnder}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>🎁</Text>
        <Text style={s.scWon}>You Won</Text>
        <Text style={s.scAmount}>₹{amount}</Text>
      </View>
      <View style={s.scCoverNative} onTouchEnd={onScratched}>
        <Text style={{ fontSize: 40, marginBottom: 10 }}>✨</Text>
        <Text style={{ color: '#FFF', fontWeight: '900' }}>TAP TO REVEAL</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scBox: { width: 280, height: 280, backgroundColor: '#FFF', borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  scUnder: { flex: 1, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  scWon: { fontSize: 18, color: '#D97706', fontWeight: '800' },
  scAmount: { fontSize: 48, color: '#B45309', fontWeight: '900' },
  scCoverNative: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#D4A843', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#FEF3C7', borderRadius: 30 },
});
