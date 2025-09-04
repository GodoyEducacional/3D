import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

let camera, scene, renderer;
let controller;
let model = null;
let modelLoading = false;

const MODEL_DISTANCE = 1.5; // distância fixa à frente da câmera (metros)
const MODEL_SCALE = 0.02; // escala fixa

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

  // Controller para colocar/mover modelo
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);
}

// Coloca ou move o modelo sempre à frente da câmera, mantendo tamanho fixo
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

// Atualiza a posição do modelo sempre à frente da câmera
function updateModelPosition() {
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

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}
