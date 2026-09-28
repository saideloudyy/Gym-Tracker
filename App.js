
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

const STORAGE_KEY = "@gym_tracker_v1";

const DEFAULT_EXERCISES = [
  { id: "bench", name: "Bench Press", zone: "Chest" },
  { id: "incline-db", name: "Incline Dumbbell Press", zone: "Chest" },
  { id: "cable-fly", name: "Cable Fly", zone: "Chest" },
  { id: "lat-pulldown", name: "Lat Pulldown", zone: "Back" },
  { id: "row", name: "Seated Cable Row", zone: "Back" },
  { id: "shoulder-press", name: "Shoulder Press", zone: "Shoulders" },
  { id: "lateral-raise", name: "Lateral Raise", zone: "Shoulders" },
  { id: "curl", name: "Dumbbell Curl", zone: "Biceps" },
  { id: "pushdown", name: "Triceps Pushdown", zone: "Triceps" },
  { id: "squat", name: "Squat", zone: "Legs" },
  { id: "leg-press", name: "Leg Press", zone: "Legs" },
  { id: "leg-curl", name: "Leg Curl", zone: "Legs" },
  { id: "calf", name: "Standing Calf Raise", zone: "Calves" },
  { id: "crunch", name: "Cable Crunch", zone: "Core" },
];

const DEFAULT_TEMPLATES = [
  {
    id: "push",
    name: "Push Day",
    exercises: [
      { exerciseId: "bench", sets: 3, targetReps: 8 },
      { exerciseId: "incline-db", sets: 3, targetReps: 10 },
      { exerciseId: "shoulder-press", sets: 3, targetReps: 10 },
      { exerciseId: "lateral-raise", sets: 3, targetReps: 12 },
      { exerciseId: "pushdown", sets: 3, targetReps: 12 },
    ],
  },
  {
    id: "pull",
    name: "Pull Day",
    exercises: [
      { exerciseId: "lat-pulldown", sets: 3, targetReps: 10 },
      { exerciseId: "row", sets: 3, targetReps: 10 },
      { exerciseId: "curl", sets: 3, targetReps: 12 },
    ],
  },
  {
    id: "legs",
    name: "Leg Day",
    exercises: [
      { exerciseId: "squat", sets: 3, targetReps: 8 },
      { exerciseId: "leg-press", sets: 3, targetReps: 10 },
      { exerciseId: "leg-curl", sets: 3, targetReps: 12 },
      { exerciseId: "calf", sets: 3, targetReps: 15 },
    ],
  },
];

const kgToLb = (kg) => kg * 2.2046226218;
const lbToKg = (lb) => lb / 2.2046226218;
const round = (n, d = 1) => Number(Number(n).toFixed(d));

function displayWeight(kg, unit) {
  if (kg == null || Number.isNaN(Number(kg))) return "-";
  return unit === "lb" ? `${round(kgToLb(kg))} lb` : `${round(kg)} kg`;
}

function dateLabel(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("Home");
  const [unit, setUnit] = useState("lb");
  const [weightEntries, setWeightEntries] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);

  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  const [templateModal, setTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [exerciseModal, setExerciseModal] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseZone, setExerciseZone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setUnit(data.unit || "lb");
          setWeightEntries(data.weightEntries || []);
          setTemplates(data.templates?.length ? data.templates : DEFAULT_TEMPLATES);
          setExercises(data.exercises?.length ? data.exercises : DEFAULT_EXERCISES);
          setWorkoutHistory(data.workoutHistory || []);
        }
      } catch (e) {
        Alert.alert("Storage error", "Could not load saved data.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ unit, weightEntries, templates, exercises, workoutHistory })
    ).catch(() => {});
  }, [ready, unit, weightEntries, templates, exercises, workoutHistory]);

  const latestWeight = weightEntries.length
    ? [...weightEntries].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    : null;

  const average7 = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = weightEntries.filter((x) => new Date(x.date).getTime() >= cutoff);
    if (!recent.length) return null;
    return recent.reduce((sum, x) => sum + x.kg, 0) / recent.length;
  }, [weightEntries]);

  const zones = [...new Set(exercises.map((e) => e.zone))];

  function addWeight() {
    const n = Number(weightInput);
    if (!n || n <= 0) {
      Alert.alert("Enter a valid weight.");
      return;
    }
    const kg = unit === "lb" ? lbToKg(n) : n;
    setWeightEntries((prev) => [
      ...prev,
      { id: Date.now().toString(), kg, date: new Date().toISOString() },
    ]);
    setWeightInput("");
    setWeightModal(false);
  }

  function addTemplate() {
    const name = templateName.trim();
    if (!name) return;
    setTemplates((prev) => [
      ...prev,
      { id: Date.now().toString(), name, exercises: [] },
    ]);
    setTemplateName("");
    setTemplateModal(false);
  }

  function addExercise() {
    const name = exerciseName.trim();
    const zone = exerciseZone.trim();
    if (!name || !zone) return;
    setExercises((prev) => [
      ...prev,
      { id: Date.now().toString(), name, zone },
    ]);
    setExerciseName("");
    setExerciseZone("");
    setExerciseModal(false);
  }

  function startWorkout(template) {
    const workoutExercises = template.exercises.map((item) => {
      const ex = exercises.find((e) => e.id === item.exerciseId);
      return {
        exerciseId: item.exerciseId,
        name: ex?.name || "Exercise",
        zone: ex?.zone || "Other",
        targetReps: item.targetReps || 10,
        sets: Array.from({ length: item.sets || 3 }, () => ({
          weightKg: "",
          reps: "",
          done: false,
        })),
      };
    });
    setActiveWorkout({
      id: Date.now().toString(),
      templateId: template.id,
      name: template.name,
      startedAt: new Date().toISOString(),
      exercises: workoutExercises,
    });
    setTab("Workout");
  }

  function updateSet(exIndex, setIndex, field, value) {
    setActiveWorkout((current) => {
      const copy = JSON.parse(JSON.stringify(current));
      copy.exercises[exIndex].sets[setIndex][field] = value;
      return copy;
    });
  }

  function addSet(exIndex) {
    setActiveWorkout((current) => {
      const copy = JSON.parse(JSON.stringify(current));
      copy.exercises[exIndex].sets.push({ weightKg: "", reps: "", done: false });
      return copy;
    });
  }

  function finishWorkout() {
    if (!activeWorkout) return;
    const completed = activeWorkout.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.done).length,
      0
    );
    const history = {
      ...activeWorkout,
      finishedAt: new Date().toISOString(),
      completedSets: completed,
    };
    setWorkoutHistory((prev) => [history, ...prev]);
    setActiveWorkout(null);
    setTab("History");
  }

  function renderHome() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Your Gym Tracker</Text>
        <Text style={styles.subtle}>Train consistently. Track everything.</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>CURRENT WEIGHT</Text>
          <Text style={styles.bigNumber}>
            {latestWeight ? displayWeight(latestWeight.kg, unit) : "Not added"}
          </Text>
          {latestWeight && (
            <Text style={styles.subtle}>{dateLabel(latestWeight.date)}</Text>
          )}
          <Pressable style={styles.primaryButton} onPress={() => setWeightModal(true)}>
            <Text style={styles.buttonText}>+ Add Weight</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <View style={[styles.statCard, { marginRight: 6 }]}>
            <Text style={styles.cardLabel}>7-DAY AVG</Text>
            <Text style={styles.statNumber}>
              {average7 ? displayWeight(average7, unit) : "-"}
            </Text>
          </View>
          <View style={[styles.statCard, { marginLeft: 6 }]}>
            <Text style={styles.cardLabel}>WORKOUTS</Text>
            <Text style={styles.statNumber}>{workoutHistory.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Start a workout</Text>
        {templates.map((t) => (
          <Pressable key={t.id} style={styles.listCard} onPress={() => startWorkout(t)}>
            <View>
              <Text style={styles.listTitle}>{t.name}</Text>
              <Text style={styles.subtle}>{t.exercises.length} exercises</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  function renderWorkouts() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Templates</Text>
          <Pressable style={styles.smallButton} onPress={() => setTemplateModal(true)}>
            <Text style={styles.buttonText}>+ Template</Text>
          </Pressable>
        </View>

        {templates.map((t) => (
          <View key={t.id} style={styles.card}>
            <Text style={styles.listTitle}>{t.name}</Text>
            <Text style={styles.subtle}>{t.exercises.length} exercises</Text>
            {t.exercises.map((item) => {
              const ex = exercises.find((e) => e.id === item.exerciseId);
              return (
                <Text key={item.exerciseId} style={styles.exerciseLine}>
                  • {ex?.name || "Exercise"} — {item.sets} × {item.targetReps}
                </Text>
              );
            })}
            <Pressable style={styles.primaryButton} onPress={() => startWorkout(t)}>
              <Text style={styles.buttonText}>Start Workout</Text>
            </Pressable>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Exercise Library</Text>
        {zones.map((zone) => (
          <View key={zone} style={styles.zoneBlock}>
            <Text style={styles.zoneTitle}>{zone}</Text>
            {exercises.filter((e) => e.zone === zone).map((e) => (
              <Text key={e.id} style={styles.exerciseLine}>• {e.name}</Text>
            ))}
          </View>
        ))}
        <Pressable style={styles.outlineButton} onPress={() => setExerciseModal(true)}>
          <Text style={styles.outlineText}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>
    );
  }

  function renderWorkout() {
    if (!activeWorkout) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No active workout</Text>
          <Text style={styles.subtle}>Choose a template to start training.</Text>
          <Pressable style={styles.primaryButton} onPress={() => setTab("Workouts")}>
            <Text style={styles.buttonText}>View Templates</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{activeWorkout.name}</Text>
        <Text style={styles.subtle}>Started {dateLabel(activeWorkout.startedAt)}</Text>

        {activeWorkout.exercises.map((ex, exIndex) => (
          <View key={ex.exerciseId} style={styles.card}>
            <Text style={styles.listTitle}>{ex.name}</Text>
            <Text style={styles.zoneTitle}>{ex.zone}</Text>

            {ex.sets.map((s, setIndex) => (
              <View key={setIndex} style={styles.setRow}>
                <Text style={styles.setNumber}>Set {setIndex + 1}</Text>
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="decimal-pad"
                  placeholder="Weight"
                  placeholderTextColor="#777"
                  value={s.weightKg === "" ? "" : displayWeight(Number(s.weightKg), unit).replace(/ kg| lb/, "")}
                  onChangeText={(v) => {
                    const n = Number(v);
                    const kg = unit === "lb" ? lbToKg(n) : n;
                    updateSet(exIndex, setIndex, "weightKg", v === "" ? "" : kg);
                  }}
                />
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="number-pad"
                  placeholder="Reps"
                  placeholderTextColor="#777"
                  value={String(s.reps)}
                  onChangeText={(v) => updateSet(exIndex, setIndex, "reps", v)}
                />
                <Pressable
                  style={[styles.check, s.done && styles.checkDone]}
                  onPress={() => updateSet(exIndex, setIndex, "done", !s.done)}
                >
                  <Text style={styles.checkText}>{s.done ? "✓" : ""}</Text>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.outlineButton} onPress={() => addSet(exIndex)}>
              <Text style={styles.outlineText}>+ Add Set</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.primaryButton} onPress={finishWorkout}>
          <Text style={styles.buttonText}>Finish Workout</Text>
        </Pressable>
        <View style={{ height: 30 }} />
      </ScrollView>
    );
  }

  function renderWeight() {
    const sorted = [...weightEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Weight</Text>
          <Pressable style={styles.smallButton} onPress={() => setWeightModal(true)}>
            <Text style={styles.buttonText}>+ Add</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>CURRENT</Text>
          <Text style={styles.bigNumber}>
            {latestWeight ? displayWeight(latestWeight.kg, unit) : "-"}
          </Text>
          <Text style={styles.subtle}>
            7-day average: {average7 ? displayWeight(average7, unit) : "-"}
          </Text>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No weight entries yet</Text>
          </View>
        ) : (
          sorted.map((w) => (
            <View key={w.id} style={styles.listCard}>
              <View>
                <Text style={styles.listTitle}>{displayWeight(w.kg, unit)}</Text>
                <Text style={styles.subtle}>{dateLabel(w.date)}</Text>
              </View>
              <Text style={styles.subtle}>
                {unit === "lb" ? `${round(w.kg)} kg` : `${round(kgToLb(w.kg))} lb`}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderHistory() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Workout History</Text>
        {workoutHistory.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No completed workouts yet</Text>
          </View>
        ) : (
          workoutHistory.map((w) => (
            <View key={w.id} style={styles.listCard}>
              <View>
                <Text style={styles.listTitle}>{w.name}</Text>
                <Text style={styles.subtle}>{dateLabel(w.finishedAt)}</Text>
              </View>
              <Text style={styles.subtle}>{w.completedSets} sets</Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  function renderSettings() {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.card}>
          <Text style={styles.listTitle}>Weight Unit</Text>
          <View style={styles.unitRow}>
            {["lb", "kg"].map((u) => (
              <Pressable
                key={u}
                style={[styles.unitButton, unit === u && styles.unitSelected]}
                onPress={() => setUnit(u)}
              >
                <Text style={styles.unitText}>{u.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.subtle}>
          Your data is saved locally on this device. Weight is stored internally in
          kilograms and converted for display, so switching units does not lose accuracy.
        </Text>
      </ScrollView>
    );
  }

  function screen() {
    if (tab === "Home") return renderHome();
    if (tab === "Workouts") return renderWorkouts();
    if (tab === "Workout") return renderWorkout();
    if (tab === "Weight") return renderWeight();
    if (tab === "History") return renderHistory();
    return renderSettings();
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading Gym Tracker...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {screen()}

      <View style={styles.nav}>
        {[
          ["Home", "Home"],
          ["Workouts", "Workouts"],
          ["Weight", "Weight"],
          ["History", "History"],
          ["Settings", "Settings"],
        ].map(([id, label]) => (
          <Pressable key={id} style={styles.navItem} onPress={() => setTab(id)}>
            <Text style={[styles.navText, tab === id && styles.navActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={weightModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modal}>
            <Text style={styles.sectionTitle}>Add Weight</Text>
            <Text style={styles.subtle}>Enter your weight in {unit.toUpperCase()}.</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder={unit === "lb" ? "264.6" : "120"}
              placeholderTextColor="#777"
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
            />
            <Pressable style={styles.primaryButton} onPress={addWeight}>
              <Text style={styles.buttonText}>Save Weight</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setWeightModal(false)}>
              <Text style={styles.outlineText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={templateModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.sectionTitle}>New Template</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Upper Body"
              placeholderTextColor="#777"
              value={templateName}
              onChangeText={setTemplateName}
            />
            <Text style={styles.subtle}>
              Create the template first. Exercise assignment can be expanded in the next version.
            </Text>
            <Pressable style={styles.primaryButton} onPress={addTemplate}>
              <Text style={styles.buttonText}>Create Template</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setTemplateModal(false)}>
              <Text style={styles.outlineText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={exerciseModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.sectionTitle}>New Exercise</Text>
            <TextInput
              style={styles.input}
              placeholder="Exercise name"
              placeholderTextColor="#777"
              value={exerciseName}
              onChangeText={setExerciseName}
            />
            <TextInput
              style={styles.input}
              placeholder="Zone / muscle group"
              placeholderTextColor="#777"
              value={exerciseZone}
              onChangeText={setExerciseZone}
            />
            <Pressable style={styles.primaryButton} onPress={addExercise}>
              <Text style={styles.buttonText}>Add Exercise</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => setExerciseModal(false)}>
              <Text style={styles.outlineText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0d10" },
  content: { padding: 18, paddingBottom: 100 },
  loading: { color: "#fff", textAlign: "center", marginTop: 80, fontSize: 18 },
  greeting: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 10 },
  subtle: { color: "#8f96a3", fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 22, marginBottom: 12 },
  card: {
    backgroundColor: "#151922",
    borderRadius: 18,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#242a36",
  },
  cardLabel: { color: "#777f8d", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  bigNumber: { color: "#fff", fontSize: 34, fontWeight: "900", marginVertical: 5 },
  statCard: {
    flex: 1,
    backgroundColor: "#151922",
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#242a36",
  },
  row: { flexDirection: "row" },
  statNumber: { color: "#fff", fontSize: 23, fontWeight: "800", marginTop: 5 },
  primaryButton: {
    backgroundColor: "#2f80ed",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 14,
  },
  smallButton: {
    backgroundColor: "#2f80ed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  buttonText: { color: "#fff", fontWeight: "800" },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#3a4250",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },
  outlineText: { color: "#cbd1dc", fontWeight: "700" },
  cancelButton: { paddingVertical: 14, alignItems: "center", marginTop: 3 },
  listCard: {
    backgroundColor: "#151922",
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#242a36",
  },
  listTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  arrow: { color: "#8f96a3", fontSize: 28 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exerciseLine: { color: "#b7bdc9", marginTop: 8, lineHeight: 20 },
  zoneBlock: { marginTop: 12, padding: 15, backgroundColor: "#11141a", borderRadius: 14 },
  zoneTitle: { color: "#2f80ed", fontWeight: "800", marginTop: 4, marginBottom: 3 },
  setRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 7 },
  setNumber: { color: "#aeb5c2", width: 45, fontSize: 12 },
  inputSmall: {
    flex: 1,
    backgroundColor: "#0d1015",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a303b",
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 9,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#3a4250",
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { backgroundColor: "#2f80ed", borderColor: "#2f80ed" },
  checkText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 6 },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    backgroundColor: "#11141a",
    borderTopWidth: 1,
    borderTopColor: "#242a36",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: { alignItems: "center", paddingHorizontal: 4 },
  navText: { color: "#777f8d", fontSize: 11, fontWeight: "700" },
  navActive: { color: "#2f80ed" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#151922",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  input: {
    backgroundColor: "#0d1015",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#2a303b",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    fontSize: 17,
  },
  unitRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  unitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#343b48",
    alignItems: "center",
  },
  unitSelected: { backgroundColor: "#2f80ed", borderColor: "#2f80ed" },
  unitText: { color: "#fff", fontWeight: "900" },
});
