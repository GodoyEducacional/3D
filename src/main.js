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

// --- NOVAS VARIÁVEIS PARA ROTAÇÃO ---
let isDragging = false;
let previousTouchX = 0;
const ROTATION_SENSITIVITY = 0.01; // Ajuste para deixar a rotação mais rápida ou lenta

const MODEL_DISTANCE = 1.5; // metros à frente da câmera
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

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);

  // --- REGISTRAR EVENTOS DE TOQUE ---
  renderer.domElement.addEventListener("touchstart", onTouchStart, false);
  renderer.domElement.addEventListener("touchmove", onTouchMove, false);
  renderer.domElement.addEventListener("touchend", onTouchEnd, false);
}

// ----- Coloca o modelo à frente da câmera -----
function onSelect() {
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

// ----- Atualiza posição fixa à frente da câmera -----
function updateModelPosition() {
  if (!model) return;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const position = new THREE.Vector3();
  position.copy(camera.position).add(direction.multiplyScalar(MODEL_DISTANCE));
  model.position.copy(position);
}

// ----- Redimensionamento -----
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----- Loop de renderização -----
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}

// --- NOVAS FUNÇÕES PARA GESTOS DE ROTAÇÃO ---

function onTouchStart(event) {
  // Só começa a arrastar se o modelo já existir e for apenas um dedo
  if (model && event.touches.length === 1) {
    isDragging = true;
    // Guarda a posição inicial do toque no eixo X
    previousTouchX = event.touches[0].clientX;
  }
}

function onTouchMove(event) {
  // Se não estiver arrastando ou não houver modelo, não faz nada
  if (!isDragging || !model) return;

  // Previne o comportamento padrão do navegador (como rolar a página)
  event.preventDefault();

  // Pega a posição X atual do toque
  const currentTouchX = event.touches[0].clientX;
  // Calcula a diferença de movimento desde o último quadro
  const deltaX = currentTouchX - previousTouchX;

  // Aplica a rotação no eixo Y (vertical) do modelo
  model.rotation.y += deltaX * ROTATION_SENSITIVITY;

  // Atualiza a posição anterior para o próximo movimento
  previousTouchX = currentTouchX;
}

function onTouchEnd(event) {
  // Para de arrastar quando o dedo é removido da tela
  isDragging = false;
}
