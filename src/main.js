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

// ----- Variáveis globais -----
let camera, scene, renderer;
let controller;
let model = null;
let modelLoading = false;

const MODEL_DISTANCE = 1.5; // metros à frente da câmera
const MODEL_SCALE = 0.02; // tamanho fixo

// Rotação com dois dedos
let rotating = false;
let lastAngle = 0;

// Overlay para detectar gestos
const touchOverlay = document.createElement("div");
touchOverlay.style.position = "fixed";
touchOverlay.style.top = "0";
touchOverlay.style.left = "0";
touchOverlay.style.width = "100%";
touchOverlay.style.height = "100%";
touchOverlay.style.zIndex = "999";
touchOverlay.style.touchAction = "none"; // previne zoom nativo
document.body.appendChild(touchOverlay);

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

  // Botão AR padrão
  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  // Luz
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Controller para colocar modelo
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", placeOrMoveModel);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);

  // Eventos do overlay para rotação com dois dedos
  touchOverlay.addEventListener("touchstart", onTouchStart);
  touchOverlay.addEventListener("touchmove", onTouchMove);
  touchOverlay.addEventListener("touchend", onTouchEnd);

  // Evento do overlay para reposicionar com 1 dedo
  touchOverlay.addEventListener("click", onSingleTouchMove);
}

// ----- Coloca ou move o modelo -----
function placeOrMoveModel() {
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

// ----- Atualiza posição do modelo sempre à frente da câmera -----
function updateModelPosition() {
  if (!model) return;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const position = new THREE.Vector3();
  position.copy(camera.position).add(direction.multiplyScalar(MODEL_DISTANCE));
  model.position.copy(position);
}

// ----- Eventos de toque para rotação -----
function onTouchStart(e) {
  if (e.touches.length === 2 && model) {
    rotating = true;
    lastAngle = Math.atan2(
      e.touches[1].clientY - e.touches[0].clientY,
      e.touches[1].clientX - e.touches[0].clientX
    );
  }
}

function onTouchMove(e) {
  if (rotating && e.touches.length === 2 && model) {
    const newAngle = Math.atan2(
      e.touches[1].clientY - e.touches[0].clientY,
      e.touches[1].clientX - e.touches[0].clientX
    );
    const delta = newAngle - lastAngle;
    model.rotation.y += delta; // já em radianos
    lastAngle = newAngle;
  }
}

function onTouchEnd(e) {
  if (e.touches.length < 2) rotating = false;
}

// ----- Reposicionamento com 1 dedo (click) -----
function onSingleTouchMove(e) {
  if (!model) return;

  // Raycast central (ou próximo do clique)
  const x = 0;
  const y = 0;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x, y }, camera);

  // Interseção com plano Y=0
  const planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersect = new THREE.Vector3();
  raycaster.ray.intersectPlane(planeY, intersect);

  model.position.copy(intersect);
}

// ----- Resize -----
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----- Loop de animação -----
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}
