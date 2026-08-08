import React from "react";
import { StyleSheet, View } from "react-native";
import { categoryColor } from "@/src/theme";

export default function CategoryDot({ kategori }: { kategori?: string }) {
  return <View style={[styles.dot, { backgroundColor: categoryColor(kategori) }]} />;
}

const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 999 },
});
