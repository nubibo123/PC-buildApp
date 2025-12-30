import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Layout, Text } from '@ui-kitten/components';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { buildPresetOptions, PresetType, SuggestedBuild } from '../../lib/recommendations';

export default function RecommendedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState<string>('Build recommendations');
  const [list, setList] = useState<SuggestedBuild[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const preset = ((params.preset as string) || 'gaming') as PresetType;

  useEffect(() => {
    const load = async () => {
      setTitle(
        preset === 'gaming' ? 'Gaming' : preset === 'office' ? 'Office' : preset === 'creator' ? 'Creator' : 'Budget'
      );
      const data = await buildPresetOptions(preset, 9);
      setList(data);
    };
    load();
  }, [preset]);

  const toNum = (v: any) => {
    const n = typeof v === 'number' ? v : Number(v);
    return isFinite(n) && !isNaN(n) ? n : 0;
  };

  const navigateToBuild = (config: any) => {
    router.push({ pathname: '/(tabs)/build', params: { initialConfig: JSON.stringify(config) } });
  };

  const compKeys = ['cpu','videoCard','memory','motherboard','internalHardDrive','powerSupply','case','monitor'] as const;

  return (
    <Layout style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1976d2" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text category="h5" style={styles.headerTitle}>🔎 {title}</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}>
        {list.length === 0 ? (
          <Text appearance="hint" style={{ textAlign:'center', marginTop: 24 }}>No matching builds found.</Text>
        ) : (
          list.map((b, idx) => (
            <Card key={idx} style={styles.card}>
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text category="s1" style={{ fontWeight: 'bold' }}>{b.label}</Text>
                  <Text style={{ color: '#607d8b' }}>Total: <Text style={styles.total}>${b.total.toFixed(2)}</Text></Text>
                </View>
                <Button size="small" onPress={() => navigateToBuild(b.config)}>Use</Button>
              </View>
              <TouchableOpacity style={styles.expandBtn} onPress={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                <Text category="s1">{expandedIdx === idx ? 'Hide details' : 'View details'}</Text>
                <Ionicons name={expandedIdx === idx ? 'chevron-up' : 'chevron-down'} size={22} />
              </TouchableOpacity>
              {expandedIdx === idx && (
                <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }}>
                  {compKeys.filter((k) => !!(b.config as any)?.[k]).map((k) => {
                    const comp: any = (b.config as any)[k];
                    const img = comp?.image_link || comp?.link_image;
                    return (
                      <View key={k} style={styles.partRow}>
                        <Image source={img ? { uri: img } : require('../../assets/images/default-avatar.png')} style={styles.partImg} resizeMode="contain" />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontWeight: 'bold', color: '#1976d2' }}>{k.toUpperCase()}</Text>
                          <Text numberOfLines={2} ellipsizeMode="tail">{comp?.name || ''}</Text>
                        </View>
                        <Text style={styles.partPrice}>${toNum(comp?.price).toFixed(2)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#f4f6fb' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 8 },
  backText: { color: '#1976d2', marginLeft: 6, fontWeight: 'bold' },
  headerTitle: { textAlign: 'center', color: '#1976d2', fontWeight: 'bold' },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  total: { color: '#1976d2', fontWeight: 'bold' },
  expandBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  partRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, minHeight: 48 },
  partImg: { width: 48, height: 48, borderRadius: 8, marginRight: 10, backgroundColor: '#eee' },
  partPrice: { color: '#4CAF50', fontWeight: 'bold', marginLeft: 8 },
});
