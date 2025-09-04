import {
  Engine,
  Scene,
  Vector3,
  HemisphericLight,
  UniversalCamera,
  Axis,
  Space,
  SceneLoader,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { XRGesturesHelper } from "@babylonjs/inspector"; // para gestos dois dedos

// ----- Canvas -----
const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.touchAction = "none"; // necessário para gestos
document.body.appendChild(canvas);

// ----- Engine e cena -----
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

// ----- Luz e câmera -----
const light = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
const camera = new UniversalCamera("cam", new Vector3(0, 1.6, 0), scene);
camera.attachControl(canvas, true);

// ----- Variáveis globais -----
let model = null;
const MODEL_SCALE = 0.02;
const MODEL_DISTANCE = 1.5;

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

// ----- Função de atualização da posição -----
function updateModelPosition() {
  if (!model) return;
  const forward = camera.getForwardRay(MODEL_DISTANCE);
  model.position = forward.origin
    .add(forward.direction.scale(MODEL_DISTANCE))
    .clone();
}

// ----- Start AR -----
startBtn.addEventListener("click", async () => {
  startBtn.style.display = "none";

  // Inicializa WebXR
  const xr = await scene.createDefaultXRExperienceAsync({
    uiOptions: { sessionMode: "immersive-ar" },
    optionalFeatures: true,
  });

  // Carrega modelo GLB
  if (!model) {
    SceneLoader.ImportMesh("", "/", "elefante.glb", scene, function (meshes) {
      model = meshes[0];
      model.scaling.scaleInPlace(MODEL_SCALE);
      updateModelPosition();
    });
  }

  // XRGestures para rotação de dois dedos
  if (xr.baseExperience) {
    const xrGestures = XRGesturesHelper.CreateDefault(xr.baseExperience, scene);
    xrGestures.twoFingerRotation = true;

    xrGestures.onTwoFingerRotationObservable.add((rotationDelta) => {
      if (model) {
        // rotaciona no eixo Y
        model.rotate(Axis.Y, rotationDelta, Space.WORLD);
      }
    });
  }

  // Atualiza posição do modelo toda vez que clicar (mesmo comportamento do "select")
  xr.baseExperience.input.onControllerAddedObservable.add((controller) => {
    controller.onMotionControllerInitObservable.add(() => {
      controller.onMainButtonStateChangedObservable.add(() => {
        if (model) updateModelPosition();
      });
    });
  });
});

// ----- Loop de render -----
engine.runRenderLoop(() => {
  scene.render();
});

// ----- Resize -----
window.addEventListener("resize", () => {
  engine.resize();
});
