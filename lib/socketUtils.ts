import { CPU, Motherboard } from '../data/csvData';

// Map of CPU microarchitectures to their corresponding socket types
const microarchitectureToSocket: { [key: string]: string } = {
  'Zen': 'AM4',
  'Zen+': 'AM4',
  'Zen 2': 'AM4',
  'Zen 3': 'AM4',
  'Zen 4': 'AM5',
  'Zen 5': 'AM5',
  
  // Intel Sockets
  'Alder Lake': 'LGA1700',
  'Raptor Lake': 'LGA1700',
  'Raptor Lake Refresh': 'LGA1700',
  'Arrow Lake': 'LGA1851',
  'Rocket Lake': 'LGA1200',
  'Comet Lake': 'LGA1200',
  'Coffee Lake': 'LGA1151',
  'Coffee Lake Refresh': 'LGA1151',
  'Kaby Lake': 'LGA1151',
  'Skylake': 'LGA1151',
  'Haswell': 'LGA1150',
  'Haswell Refresh': 'LGA1150',
  'Broadwell': 'LGA2011-3',
  'Sandy Bridge': 'LGA1155',
  'Ivy Bridge': 'LGA1155',
};

export const mapCpuToSocket = (cpuName: string, microarchitecture: string): string | null => {
  // First try to get socket from microarchitecture
  const socket = microarchitectureToSocket[microarchitecture];
  if (socket) return socket;

  // If microarchitecture mapping fails, try to extract from CPU name
  const cpuNameLower = cpuName.toLowerCase();
  
  // AMD Threadripper
  if (cpuNameLower.includes('threadripper')) {
    if (cpuNameLower.includes('3')) return 'sTRX4';
    return 'sTR4';
  }
  
  // AMD Ryzen
  if (cpuNameLower.includes('ryzen')) {
    if (cpuNameLower.includes('9') || cpuNameLower.includes('8') || cpuNameLower.includes('7') || cpuNameLower.includes('5') || cpuNameLower.includes('3')) {
      if (cpuNameLower.includes('9') || cpuNameLower.includes('8')) return 'AM5';
      if (cpuNameLower.includes('7') || cpuNameLower.includes('5') || cpuNameLower.includes('3')) {
        if (cpuNameLower.includes('7000') || cpuNameLower.includes('8000') || cpuNameLower.includes('9000')) return 'AM5';
        if (cpuNameLower.includes('5000') || cpuNameLower.includes('3000')) return 'AM4';
      }
    }
  }

  // Intel Core Ultra
  if (cpuNameLower.includes('core ultra')) return 'LGA1851';
  
  // Intel Core i9/i7/i5/i3
  if (cpuNameLower.includes('core i')) {
    if (cpuNameLower.includes('14') || cpuNameLower.includes('13') || cpuNameLower.includes('12')) return 'LGA1700';
    if (cpuNameLower.includes('11') || cpuNameLower.includes('10')) return 'LGA1200';
    if (cpuNameLower.includes('9') || cpuNameLower.includes('8') || cpuNameLower.includes('7') || cpuNameLower.includes('6')) return 'LGA1151';
    if (cpuNameLower.includes('4')) return 'LGA1150';
  }

  return null;
};

export const checkSocketCompatibility = (cpu: CPU | null, motherboard: Motherboard | null): boolean => {
  if (!cpu || !motherboard) return true; // Return true if either part is not selected

  const cpuSocket = mapCpuToSocket(cpu.name, cpu.microarchitecture);
  const motherboardSocket = motherboard.socket;

  if (!cpuSocket || !motherboardSocket) return true; // Return true if socket information is missing

  return cpuSocket.trim().toLowerCase() === motherboardSocket.trim().toLowerCase();
};