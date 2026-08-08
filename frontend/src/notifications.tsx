import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useData } from "@/src/context/DataContext";
import { storage } from "@/src/utils/storage";

const SEEN_KEY = "jobmail_inbox_seen_count";
const POLL_MS = 90_000; // foreground poll interval

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensurePermissions() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) await Notifications.requestPermissionsAsync();
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("inbox", {
        name: "Inbox HRD",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  } catch {
    // Expo Go / unsupported — degrade silently.
  }
}

// Mounts inside DataProvider. Polls in the foreground and fires a local
// notification whenever new rows appear in the Email Masuk tab.
export default function NotificationManager() {
  const { inbox, refresh, connected } = useData();
  const baselineRef = useRef<number | null>(null);

  // Initialise baseline from persisted count.
  useEffect(() => {
    (async () => {
      await ensurePermissions();
      const saved = await storage.getItem<number>(SEEN_KEY, -1);
      baselineRef.current = saved === -1 ? null : (saved as number);
    })();
  }, []);

  // Foreground polling loop.
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      if (AppState.currentState === "active") refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [connected, refresh]);

  // Detect growth and notify.
  useEffect(() => {
    const count = inbox.length;
    if (count === 0) return;
    if (baselineRef.current === null) {
      // First observation — set baseline without notifying existing items.
      baselineRef.current = count;
      storage.setItem(SEEN_KEY, count);
      return;
    }
    if (count > baselineRef.current) {
      const newItems = inbox.slice(baselineRef.current);
      newItems.forEach((it) => {
        Notifications.scheduleNotificationAsync({
          content: {
            title: `${it.kategori || "Email"} - ${it.nama_perusahaan}`,
            body: it.poin_kunci || it.subjek,
            data: { rowIndex: it.row_index },
          },
          trigger: null,
        }).catch(() => {});
      });
      baselineRef.current = count;
      storage.setItem(SEEN_KEY, count);
    }
  }, [inbox]);

  // Tap on a notification -> open the related detail screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const rowIndex = resp.notification.request.content.data?.rowIndex;
      if (rowIndex != null) router.push(`/email/${rowIndex}`);
    });
    return () => sub.remove();
  }, []);

  return null;
}
