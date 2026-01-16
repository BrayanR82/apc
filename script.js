const URL_DEL_MODELO = "./model/"; // termina en "/"
let model, webcam, maxPredictions;
let isRunning = false;
let vantaInstance = null;

const recyclingMap = {
  // "ClaseDelModelo": { bin: "Amarillo", reason: "Porque es un envase ligero" }
  "Botella de plástico": { bin: "Amarillo", reason: "Porque es un envase ligero." },
  "Lata": { bin: "Amarillo", reason: "El metal de envases va al contenedor amarillo." },
  "Caja de cartón": { bin: "Azul", reason: "Papel y cartón se reciclan en el contenedor azul." },
  "Periódico": { bin: "Azul", reason: "Material celulósico para papel." },
  "Botella de vidrio": { bin: "Verde", reason: "Vidrios van al contenedor verde." },
  "Frasco de vidrio": { bin: "Verde", reason: "Recipientes de vidrio se depositan en verde." },
  "Orgánico": { bin: "Orgánico", reason: "Residuos biodegradables al contenedor marrón u orgánico." },
  "Pila": { bin: "Punto limpio", reason: "Residuos peligrosos: llévalo a un punto limpio." }
};

const binColorClass = (bin) => {
  if (bin.toLowerCase().includes("amarillo")) return "yellow";
  if (bin.toLowerCase().includes("azul")) return "blue";
  if (bin.toLowerCase().includes("verde")) return "green";
  return "blue";
};

async function init() {
  if (!URL_DEL_MODELO || URL_DEL_MODELO === "PEGA_AQUÍ_LA_URL_DE_TU_MODELO/") {
    alert("⚠️ Configura URL_DEL_MODELO en script.js");
    return;
  }

  const btn = document.getElementById("start-btn");
  btn.disabled = true;
  btn.textContent = "Cargando modelo...";

  try {
    const modelURL = URL_DEL_MODELO + "model.json";
    const metadataURL = URL_DEL_MODELO + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(640, 480, flip);
    await webcam.setup();
    await webcam.play();

    isRunning = true;
    btn.textContent = "Detener Cámara";
    btn.disabled = false;
    btn.onclick = stopCamera;

    const webcamContainer = document.getElementById("webcam-container");
    webcamContainer.innerHTML = "";
    webcamContainer.appendChild(webcam.canvas);
    webcamContainer.style.background = "transparent";

    const labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = "";
    for (let i = 0; i < maxPredictions; i++) {
      const div = document.createElement("div");
      div.className = "result-card glass-light";
      div.innerHTML = `
        <div class="result-meta">
          <span class="result-label">Escaneando...</span>
          <span class="result-confidence">0%</span>
          <div class="result-bar" style="height:6px;background:rgba(0,0,0,0.1);border-radius:3px;margin-top:6px;overflow:hidden;">
            <div class="result-bar-fill" style="width:0%;height:100%;background:var(--accent-blue);transition:width 0.3s ease;"></div>
          </div>
          <span class="result-reason">Analizando...</span>
        </div>
        <span class="badge">--</span>
      `;
      labelContainer.appendChild(div);
    }

    window.requestAnimationFrame(loop);
  } catch (err) {
    console.error("Error:", err);
    btn.textContent = "Error al cargar";
    btn.disabled = false;
  }
}

function stopCamera() {
  if (webcam) {
    webcam.pause();
    isRunning = false;
  }
  const btn = document.getElementById("start-btn");
  btn.textContent = "Iniciar Cámara";
  btn.onclick = init;
  btn.disabled = false;
}

async function loop() {
  if (!isRunning) return;
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(webcam.canvas);
  const labelContainer = document.getElementById("label-container");

  // ordenar por probabilidad descendente
  const sorted = prediction.sort((a, b) => b.probability - a.probability);

  sorted.forEach((pred, i) => {
    const card = labelContainer.children[i];
    const meta = recyclingMap[pred.className] || { 
      bin: "Guía", 
      reason: "Consulta la guía para más detalle." 
    };
    const confidence = (pred.probability * 100).toFixed(1);
    const badgeClass = binColorClass(meta.bin);

    const label = card.querySelector(".result-label");
    const confText = card.querySelector(".result-confidence");
    const barFill = card.querySelector(".result-bar-fill");
    const reason = card.querySelector(".result-reason");
    const badge = card.querySelector(".badge");

    // Animación suave del texto
    label.textContent = pred.className;
    confText.textContent = `${confidence}%`;
    barFill.style.width = `${confidence}%`;
    reason.textContent = `${meta.bin} • ${meta.reason}`;
    
    badge.textContent = meta.bin;
    badge.className = `badge ${badgeClass}`;

    // Highlight del resultado más confiado
    if (i === 0 && confidence > 60) {
      card.style.transform = "scale(1.02)";
      card.style.boxShadow = "0 12px 32px rgba(0,0,0,0.1)";
    } else {
      card.style.transform = "scale(1)";
      card.style.boxShadow = "var(--shadow)";
    }
  });
}

// Guía page: hash sync for bin panels
function initGuiaSync() {
  const buttons = Array.from(document.querySelectorAll('.bin-btn'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  let isTransitioning = false;
  
  async function syncHash() {
    if (isTransitioning) return;
    
    const hash = window.location.hash || '';
    const targetPanel = hash ? document.querySelector(hash) : null;
    
    if (!targetPanel) return;
    
    // Encontrar panel activo actual
    const activePanel = panels.find(p => p.classList.contains('active'));
    
    // Si es el mismo panel, no hacer nada
    if (activePanel === targetPanel) return;
    
    isTransitioning = true;
    
    // Ocultar panel anterior
    if (activePanel) {
      activePanel.classList.add('exiting');
      
      activePanel.classList.remove('active', 'exiting');
      activePanel.style.display = 'none';
    }
    
    // Mostrar nuevo panel
    targetPanel.style.display = 'block';
    targetPanel.classList.add('active');
    
    // Actualizar botones
    buttons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('href') === hash);
    });
    
    isTransitioning = false;
  }
  
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.hash = btn.getAttribute('href');
    });
  });
  
  window.addEventListener('hashchange', syncHash);
  syncHash();
}

function initVanta() {
  const vantaBg = document.getElementById("vanta-background");
  if (!vantaBg || vantaInstance) return;

  if (typeof VANTA !== 'undefined') {
    vantaInstance = VANTA.WAVES({
      el: "#vanta-background",
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x2f80ed,
      waveHeight: 12.00,
      waveSpeed: 0.80,
      zoom: 1.25
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initVanta();
  
  if (document.getElementById("start-btn")) {
    document.getElementById("start-btn").addEventListener("click", init);
  }
  
  if (document.querySelectorAll('.bin-btn').length > 0) {
    initGuiaSync();
  }
});

// Try to init Vanta on window load as fallback
window.addEventListener('load', () => {
  if (!vantaInstance) {
    initVanta();
  }
});
