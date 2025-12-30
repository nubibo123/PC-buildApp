import {
  loadCaseData,
  loadCPUData,
  loadInternalHardDriveData,
  loadMemoryData,
  loadMonitorData,
  loadMotherboardData,
  loadPowerSupplyData,
  loadVideoCardData,
} from '../data/csvData';
import { mapCpuToSocket } from './socketUtils';

export type PresetType = 'gaming' | 'office' | 'creator' | 'budget';

export type SuggestedBuild = {
  label: string;
  total: number;
  config: any;
};

const toNum = (v: any) => {
  const n = typeof v === 'number' ? v : Number(v);
  return isFinite(n) && !isNaN(n) ? n : 0;
};

const sumConfigPrice = (cfg: any) => {
  return ['cpu','memory','motherboard','videoCard','case','powerSupply','internalHardDrive','monitor']
    .reduce((acc, k) => acc + toNum(cfg?.[k]?.price), 0);
};

const pickByTier = <T extends { price?: number }>(arr: T[], tier: 'budget' | 'mid' | 'high'): T | null => {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr]
    .filter((x) => toNum((x as any).price) > 0)
    .sort((a, b) => toNum((a as any).price) - toNum((b as any).price));
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  if (tier === 'budget') return sorted[Math.max(0, Math.floor(sorted.length * 0.15))];
  if (tier === 'mid') return sorted[Math.floor(sorted.length * 0.5)];
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))];
};

const parseCapacityGB = (cap?: string): number => {
  if (!cap) return 0;
  const m = cap.match(/([\d.]+)\s*(TB|GB)/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const unit = m[2].toUpperCase();
  return unit === 'TB' ? num * 1024 : num;
};

const parseMemoryTotalGB = (modules?: string): number => {
  // e.g., "2x8GB" => 16, "1x16GB" => 16
  if (!modules) return 0;
  const m = modules.match(/(\d+)x(\d+)\s*GB/i);
  if (!m) return 0;
  return parseInt(m[1], 10) * parseInt(m[2], 10);
};

function pickByTierWithOffset<T extends { price?: number }>(arr: T[], tier: 'budget'|'mid'|'high', offset: number): T | null {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr]
    .filter((x) => toNum((x as any).price) > 0)
    .sort((a, b) => toNum((a as any).price) - toNum((b as any).price));
  if (sorted.length === 0) return null;
  const q = tier === 'budget' ? 0.15 : tier === 'mid' ? 0.5 : 0.85;
  let idx = Math.floor(sorted.length * q) + offset;
  idx = Math.max(0, Math.min(sorted.length - 1, idx));
  return sorted[idx];
}

export async function buildPresetOptions(preset: PresetType, total: number = 9): Promise<SuggestedBuild[]> {
  const [cpusRaw, gpusRaw, memsRaw, psusRaw, storagesRaw, mobsRaw, casesRaw, monitorsRaw] = await Promise.all([
    loadCPUData(),
    loadVideoCardData(),
    loadMemoryData(),
    loadPowerSupplyData(),
    loadInternalHardDriveData(),
    loadMotherboardData(),
    loadCaseData(),
    loadMonitorData(),
  ]);

  const withPrice = <T extends { price?: any }>(arr: T[]) => arr.filter((x) => toNum((x as any).price) > 0);
  const cpus = withPrice(cpusRaw);
  const gpus = withPrice(gpusRaw);
  const mems = withPrice(memsRaw);
  const psus = withPrice(psusRaw);
  const storages = withPrice(storagesRaw);
  const mobs = withPrice(mobsRaw);
  const cases = withPrice(casesRaw);
  const monitors = withPrice(monitorsRaw);

  const makeGaming = (tier: 'budget'|'mid'|'high', offset: number) => {
    const cpu = pickByTierWithOffset(cpus.filter((c: any) => (c.core_count||0) >= (tier==='high'?8:6) && (c.boost_clock||0) >= (tier==='high'?4.5:4.0)), tier, offset) || pickByTierWithOffset(cpus, tier, offset);
    const videoCard = pickByTierWithOffset(gpus.filter((g: any) => (g.memory||0) >= (tier==='high'?12:8)), tier, offset) || pickByTierWithOffset(gpus, tier, offset);
    const memory = pickByTierWithOffset(mems.filter((m: any) => parseMemoryTotalGB(m.modules) >= (tier==='high'?32:16)), tier, offset) || pickByTierWithOffset(mems, tier, offset);
    const powerSupply = pickByTierWithOffset(psus.filter((p: any) => (p.wattage||0) >= (tier==='high'?750:650)), tier, offset) || pickByTierWithOffset(psus, tier, offset);
    const internalHardDrive = pickByTierWithOffset(storages.filter((s: any) => /ssd/i.test(s.type||'') && parseCapacityGB(s.capacity) >= (tier==='high'?1000:500)), tier, offset) || pickByTierWithOffset(storages, tier, offset);
    const monitor = pickByTierWithOffset(monitors.filter((m: any) => (m.refresh_rate||0) >= (tier==='high'?144:120)), tier, offset) || pickByTierWithOffset(monitors, tier, offset);
    const motherboard = (() => {
      if (cpu) {
        const cpuSocket = mapCpuToSocket((cpu as any).name, (cpu as any).microarchitecture || '');
        const compatible = cpuSocket ? mobs.filter((m: any) => (m.socket || '').toLowerCase() === cpuSocket.toLowerCase()) : [];
        return pickByTierWithOffset(compatible, tier, offset) || pickByTierWithOffset(mobs, tier, offset);
      }
      return pickByTierWithOffset(mobs, tier, offset);
    })();
    const pcCase = pickByTier(cases, tier);
    return { cpu, memory, motherboard, videoCard, case: pcCase, powerSupply, internalHardDrive, monitor };
  };

  const makeOffice = (tier: 'budget'|'mid'|'high', offset: number) => {
    let cpu = pickByTierWithOffset(cpus.filter((c: any) => (c.core_count||0) >= 4 && /intel|amd/i.test(c.manufacturer||'')), tier, offset);
    if (!cpu) cpu = pickByTierWithOffset(cpus.filter((c: any) => !!(c.graphics && /vega|radeon|uhd|iris/i.test(c.graphics))), tier, offset) || pickByTierWithOffset(cpus, tier, offset);
    const videoCard = null;
    const memory = pickByTierWithOffset(mems.filter((m: any) => parseMemoryTotalGB(m.modules) >= (tier==='high'?32:16)), tier, offset) || pickByTierWithOffset(mems, tier, offset);
    const internalHardDrive = pickByTierWithOffset(storages.filter((s: any) => /ssd/i.test(s.type||'') && parseCapacityGB(s.capacity) >= (tier==='high'?1000:500)), tier, offset) || pickByTierWithOffset(storages, tier, offset);
    const powerSupply = pickByTierWithOffset(psus.filter((p: any) => (p.wattage||0) >= 450 && (p.wattage||0) <= (tier==='high'?700:600)), tier, offset) || pickByTierWithOffset(psus, tier, offset);
    const monitor = pickByTierWithOffset(monitors.filter((m: any) => (m.refresh_rate||0) >= 60 && /1920x1080|1080p/i.test(m.resolution||'')), tier, offset) || pickByTierWithOffset(monitors, tier, offset);
    const motherboard = (() => {
      if (cpu) {
        const cpuSocket = mapCpuToSocket((cpu as any).name, (cpu as any).microarchitecture || '');
        const compatible = cpuSocket ? mobs.filter((m: any) => (m.socket || '').toLowerCase() === cpuSocket.toLowerCase()) : [];
        return pickByTierWithOffset(compatible, tier, offset) || pickByTierWithOffset(mobs, tier, offset);
      }
      return pickByTierWithOffset(mobs, tier, offset);
    })();
    const pcCase = pickByTier(cases, tier);
    return { cpu, memory, motherboard, videoCard, case: pcCase, powerSupply, internalHardDrive, monitor };
  };

  const makeCreator = (tier: 'budget'|'mid'|'high', offset: number) => {
    const cpu = pickByTierWithOffset(cpus.filter((c: any) => (c.core_count||0) >= (tier==='high'?12:8) && (c.thread_count||0) >= (tier==='high'?20:16)), tier, offset) || pickByTierWithOffset(cpus, tier, offset);
    const videoCard = pickByTierWithOffset(gpus.filter((g: any) => (g.memory||0) >= (tier==='high'?16:12)), tier, offset) || pickByTierWithOffset(gpus, tier, offset);
    const memory = pickByTierWithOffset(mems.filter((m: any) => parseMemoryTotalGB(m.modules) >= (tier==='high'?64:32)), tier, offset) || pickByTierWithOffset(mems, tier, offset);
    const internalHardDrive = pickByTierWithOffset(storages.filter((s: any) => /ssd/i.test(s.type||'') && parseCapacityGB(s.capacity) >= (tier==='high'?2000:1000)), tier, offset) || pickByTierWithOffset(storages, tier, offset);
    const powerSupply = pickByTierWithOffset(psus.filter((p: any) => (p.wattage||0) >= (tier==='high'?850:750)), tier, offset) || pickByTierWithOffset(psus, tier, offset);
    const monitor = pickByTierWithOffset(monitors.filter((m: any) => /2560x1440|3840x2160|1440p|4k/i.test(m.resolution||'')), tier, offset) || pickByTierWithOffset(monitors, tier, offset);
    const motherboard = (() => {
      if (cpu) {
        const cpuSocket = mapCpuToSocket((cpu as any).name, (cpu as any).microarchitecture || '');
        const compatible = cpuSocket ? mobs.filter((m: any) => (m.socket || '').toLowerCase() === cpuSocket.toLowerCase()) : [];
        return pickByTierWithOffset(compatible, tier, offset) || pickByTierWithOffset(mobs, tier, offset);
      }
      return pickByTierWithOffset(mobs, tier, offset);
    })();
    const pcCase = pickByTier(cases, tier);
    return { cpu, memory, motherboard, videoCard, case: pcCase, powerSupply, internalHardDrive, monitor };
  };

  const makeBudget = (tier: 'budget'|'mid'|'high', offset: number) => {
    let cpu = pickByTierWithOffset(cpus.filter((c: any) => (c.core_count||0) >= 4), tier, offset) || pickByTierWithOffset(cpus, tier, offset);
    const cpuWithIGPU = pickByTierWithOffset(cpus.filter((c: any) => !!(c.graphics && /vega|radeon|uhd|iris/i.test(c.graphics))), tier, offset);
    if (cpuWithIGPU) cpu = cpuWithIGPU;
    const videoCard = null;
    const memory = pickByTierWithOffset(mems.filter((m: any) => parseMemoryTotalGB(m.modules) >= (tier==='high'?32:16)), tier, offset) || pickByTierWithOffset(mems, tier, offset);
    const internalHardDrive = pickByTierWithOffset(storages.filter((s: any) => /ssd/i.test(s.type||'') && parseCapacityGB(s.capacity) >= (tier==='high'?1000:500)), tier, offset) || pickByTierWithOffset(storages, tier, offset);
    const powerSupply = pickByTierWithOffset(psus.filter((p: any) => (p.wattage||0) >= 450 && (p.wattage||0) <= 650), tier, offset) || pickByTierWithOffset(psus, tier, offset);
    const monitor = pickByTierWithOffset(monitors, tier, offset);
    const motherboard = (() => {
      if (cpu) {
        const cpuSocket = mapCpuToSocket((cpu as any).name, (cpu as any).microarchitecture || '');
        const compatible = cpuSocket ? mobs.filter((m: any) => (m.socket || '').toLowerCase() === cpuSocket.toLowerCase()) : [];
        return pickByTierWithOffset(compatible, tier, offset) || pickByTierWithOffset(mobs, tier, offset);
      }
      return pickByTierWithOffset(mobs, tier, offset);
    })();
    const pcCase = pickByTier(cases, tier);
    return { cpu, memory, motherboard, videoCard, case: pcCase, powerSupply, internalHardDrive, monitor };
  };

  const makers = {
    gaming: makeGaming,
    office: makeOffice,
    creator: makeCreator,
    budget: makeBudget,
  } as const;

  const labels = {
    budget: 'Budget',
    mid: 'Mid-range',
    high: 'High-end',
  } as const;

  // Generate up to 9 variants: 3 tiers x 3 offsets (-1,0,+1)
  const tierList: Array<'budget'|'mid'|'high'> = ['budget','mid','high'];
  const offsets = [-1, 0, 1];
  const titlePrefix = preset === 'gaming' ? 'Gaming' : preset === 'office' ? 'Office' : preset === 'creator' ? 'Creator' : 'Budget';

  let results: SuggestedBuild[] = [];
  for (const tier of tierList) {
    let variantIndex = 1;
    for (const off of offsets) {
      const cfg = makers[preset](tier, off);
      const totalPrice = sumConfigPrice(cfg);
      if (isFinite(totalPrice) && totalPrice > 0) {
        results.push({
          label: `${titlePrefix} - ${labels[tier]} • Option ${variantIndex}`,
          total: totalPrice,
          config: cfg,
        });
      }
      variantIndex++;
      if (results.length >= total) break;
    }
    if (results.length >= total) break;
  }

  // If fewer than requested, fall back to single-tier defaults
  if (results.length < total) {
    for (const tier of tierList) {
      const cfg = makers[preset](tier, 0);
      const totalPrice = sumConfigPrice(cfg);
      if (isFinite(totalPrice) && totalPrice > 0) {
        results.push({ label: `${titlePrefix} - ${labels[tier]} • Fallback`, total: totalPrice, config: cfg });
      }
      if (results.length >= total) break;
    }
  }

  // Sort by total ascending for a clean list
  results.sort((a, b) => a.total - b.total);
  return results.slice(0, total);
}
