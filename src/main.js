import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ----- Botão Start AR -----
const startBtn = document.createElement("button");
startBtn.textContent = "Start AR";
startBtn.style.position = "fixed";
startBtn.style.top = "50%";
startBtn.style.left = "50%";
startBtn.style.transform = "translate(-50%, -50%)";
startBtn.style.padding = "20px 40px";
startBtn.style.fontSize = "24px";
startBtn.style.background = "#007bff";
startBtn.style.color = "white";
startBtn.style.border = "none";
startBtn.style.borderRadius = "8px";
startBtn.style.cursor = "pointer";
startBtn.style.zIndex = "1000";
document.body.appendChild(startBtn);

// ----- Variáveis -----
let camera, scene, renderer;
let controller;
let model = null;
let modelLoading = false;

// --- VARIÁVEIS PARA A NOVA LÓGICA DE ROTAÇÃO ---
let isDragging = false;
let previousTouchX = 0;
let previousControllerPosition = new THREE.Vector3();
const ROTATION_SENSITIVITY = 0.01; // Ajuste a sensibilidade conforme necessário
let touchStartX = 0;

const MODEL_DISTANCE = 1.5;
const MODEL_SCALE = 0.02;

// ----- Inicialização -----
startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  init();
  animate();
});

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Adiciona eventos de toque na tela
  renderer.domElement.addEventListener('touchstart', onTouchStart, false);
  renderer.domElement.addEventListener('touchmove', onTouchMove, false);
  renderer.domElement.addEventListener('touchend', onTouchEnd, false);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  controller = renderer.xr.getController(0);
  scene.add(controller);

  // --- OUVINTES DE EVENTO DO CONTROLE AR ---
  controller.addEventListener("select", onSelect); // Para posicionar o modelo
  controller.addEventListener("selectstart", onSelectStart);
  controller.addEventListener("selectend", onSelectEnd);

  window.addEventListener("resize", onWindowResize);
}

// ----- Funções de Interação -----

function onSelect() {
  // Chamado com um toque rápido
  if (!model && !modelLoading) {
    modelLoading = true;
    const loader = new GLTFLoader();
    loader.load(
      "/elefante.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        scene.add(model);
        modelLoading = false;
        updateModelPosition();
      },
      undefined,
      (err) => {
        console.error("Erro ao carregar modelo:", err);
        modelLoading = false;
      }
    );
  } else if (model) {
    updateModelPosition();
  }
}

function onSelectStart() {
  if (model) {
    isDragging = true;
    // Salva a posição inicial do controle (dedo) quando o toque começa
    previousControllerPosition.copy(controller.position);
  }
}

function onSelectEnd() {
  isDragging = false;
}

// ----- Eventos de Toque -----
function onTouchStart(event) {
  if (model) {
    event.preventDefault();
    isDragging = true;
    touchStartX = event.touches[0].clientX;
    previousTouchX = touchStartX;
  }
}

function onTouchMove(event) {
  if (isDragging && model) {
    event.preventDefault();
    const touchX = event.touches[0].clientX;
    const deltaX = (touchX - previousTouchX) * ROTATION_SENSITIVITY;
    model.rotation.y += deltaX;
    previousTouchX = touchX;
  }
}

function onTouchEnd(event) {
  isDragging = false;
}

// ----- Posição e Redimensionamento -----

function updateModelPosition() {
  if (!model) return;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const position = new THREE.Vector3();
  position.copy(camera.position).add(direction.multiplyScalar(MODEL_DISTANCE));
  model.position.copy(position);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----- Loop Principal -----

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  if (model) {
    // Mantém o modelo sempre de frente para a câmera no eixo Y
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Mantém apenas a rotação no eixo Y
    
    // A rotação do modelo é mantida independente, apenas atualizamos a posição
    if (!isDragging) {
      updateModelPosition();
    }
  }

  renderer.render(scene, camera);
}
