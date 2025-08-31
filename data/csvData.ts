import { get, ref } from 'firebase/database';
import { database } from '../lib/firebase';

export interface CPU {
  name: string;
  price: number;
  core_count: number;
  thread_count: number;
  core_clock: number;
  boost_clock: number;
  tdp: number;
  microarchitecture: string;
  graphics: string;
  link_image: string;
  manufacturer: string;
  series: string;
}

export interface Memory {
  name: string;
  price: number;
  speed: string;
  modules: string;
  cas_latency: number;
  image_link: string;
}

export interface Motherboard {
  name: string;
  price: number;
  socket: string;
  form_factor: string;
  max_memory: number;
  image_link: string;
}

export interface VideoCard {
  name: string;
  price: number;
  chipset: string;
  memory: number;
  core_clock: number;
  image_link: string;
}

export interface Case {
  name: string;
  price: number;
  type: string;
  color: string;
  psu: string;
  side_panel: string;
  image_link: string;
}

export interface PowerSupply {
  name: string;
  price: number;
  type: string;
  efficiency: string;
  wattage: number;
  modular: string;
  image_link: string;
}

export interface InternalHardDrive {
  name: string;
  price: number;
  capacity: string;
  type: string;
  cache: string;
  form_factor: string;
  interface: string;
  image_link: string;
}

export interface Monitor {
  name: string;
  price: number;
  resolution: string;
  size: string;
  refresh_rate: number;
  response_time: string;
  panel_type: string;
  image_link: string;
}

const processImageLink = (link: string | undefined): string => {
  if (!link) return '';
  try {
    const url = new URL(link);
    return url.toString();
  } catch (error) {
    console.error('Invalid image URL:', error);
    return '';
  }
};

const mapCPUData = (item: any): CPU => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  core_count: Number(item.core_count) || 0,
  thread_count: Number(item.thread_count) || 0,
  core_clock: Number(item.core_clock) || 0,
  boost_clock: Number(item.boost_clock) || 0,
  tdp: Number(item.tdp) || 0,
  microarchitecture: item.microarchitecture || '',
  graphics: item.graphics || '',
  link_image: processImageLink(item.link_image),
  manufacturer: item.manufacturer || '',
  series: item.series || ''
});

const mapMemoryData = (item: any): Memory => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  speed: item.speed || '',
  modules: item.modules || '',
  cas_latency: Number(item.cas_latency) || 0,
  image_link: processImageLink(item.link_image),
});

const mapMotherboardData = (item: any): Motherboard => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  socket: item.socket || '',
  form_factor: item.form_factor || '',
  max_memory: Number(item.max_memory) || 0,
  image_link: processImageLink(item.link_image),
});

const mapVideoCardData = (item: any): VideoCard => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  chipset: item.chipset || '',
  memory: Number(item.memory) || 0,
  core_clock: Number(item.core_clock) || 0,
  image_link: processImageLink(item.link_image),
});

const mapCaseData = (item: any): Case => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  type: item.type || '',
  color: item.color || '',
  psu: item.psu || '',
  side_panel: item.side_panel || '',
  image_link: processImageLink(item.link_image),
});

const mapPowerSupplyData = (item: any): PowerSupply => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  type: item.type || '',
  efficiency: item.efficiency || '',
  wattage: Number(item.wattage) || 0,
  modular: item.modular || '',
  image_link: processImageLink(item.link_image),
});

const mapInternalHardDriveData = (item: any): InternalHardDrive => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  capacity: item.capacity || '',
  type: item.type || '',
  cache: item.cache || '',
  form_factor: item.form_factor || '',
  interface: item.interface || '',
  image_link: processImageLink(item.link_image),
});

const mapMonitorData = (item: any): Monitor => ({
  name: item.name || '',
  price: Number(item.price) || 0,
  resolution: item.resolution || '',
  size: item.size || '',
  refresh_rate: Number(item.refresh_rate) || 0,
  response_time: item.response_time || '',
  panel_type: item.panel_type || '',
  image_link: processImageLink(item.link_image),
});

export const loadCPUData = async (searchQuery?: string): Promise<CPU[]> => {
  try {
    const cpuRef = ref(database, 'components/cpu');
    const snapshot = await get(cpuRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    // Nếu có searchQuery, filter trực tiếp từ database
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.manufacturer && item.manufacturer.toLowerCase().includes(query)) ||
        (item.series && item.series.toLowerCase().includes(query))
      );
    }

    return items.map(mapCPUData);
  } catch (error) {
    console.error('Error loading CPU data:', error);
    throw error;
  }
};

export const loadMemoryData = async (searchQuery?: string): Promise<Memory[]> => {
  try {
    const memoryRef = ref(database, 'components/memory');
    const snapshot = await get(memoryRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    // Nếu có searchQuery, filter trực tiếp từ database
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.speed && item.speed.toLowerCase().includes(query)) ||
        (item.modules && item.modules.toLowerCase().includes(query))
      );
    }

    return items.map(mapMemoryData);
  } catch (error) {
    console.error('Error loading Memory data:', error);
    throw error;
  }
};

export const loadMotherboardData = async (searchQuery?: string): Promise<Motherboard[]> => {
  try {
    const motherboardRef = ref(database, 'components/motherboard');
    const snapshot = await get(motherboardRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    // Nếu có searchQuery, filter trực tiếp từ database
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.socket && item.socket.toLowerCase().includes(query)) ||
        (item.form_factor && item.form_factor.toLowerCase().includes(query))
      );
    }

    return items.map(mapMotherboardData);
  } catch (error) {
    console.error('Error loading Motherboard data:', error);
    throw error;
  }
};

export const loadVideoCardData = async (searchQuery?: string): Promise<VideoCard[]> => {
  try {
    const videoCardRef = ref(database, 'components/video-card');
    const snapshot = await get(videoCardRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    // Nếu có searchQuery, filter trực tiếp từ database
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.chipset && item.chipset.toLowerCase().includes(query))
      );
    }

    return items.map(mapVideoCardData);
  } catch (error) {
    console.error('Error loading Video Card data:', error);
    throw error;
  }
};

export const loadCaseData = async (searchQuery?: string): Promise<Case[]> => {
  try {
    const caseRef = ref(database, 'components/case');
    const snapshot = await get(caseRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        (item.color && item.color.toLowerCase().includes(query))
      );
    }

    return items.map(mapCaseData);
  } catch (error) {
    console.error('Error loading Case data:', error);
    throw error;
  }
};

export const loadPowerSupplyData = async (searchQuery?: string): Promise<PowerSupply[]> => {
  try {
    const psuRef = ref(database, 'components/power-supply');
    const snapshot = await get(psuRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        (item.efficiency && item.efficiency.toLowerCase().includes(query))
      );
    }

    return items.map(mapPowerSupplyData);
  } catch (error) {
    console.error('Error loading Power Supply data:', error);
    throw error;
  }
};

export const loadInternalHardDriveData = async (searchQuery?: string): Promise<InternalHardDrive[]> => {
  try {
    const hddRef = ref(database, 'components/internal-hard-drive');
    const snapshot = await get(hddRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.type && item.type.toLowerCase().includes(query)) ||
        (item.capacity && item.capacity.toLowerCase().includes(query))
      );
    }

    return items.map(mapInternalHardDriveData);
  } catch (error) {
    console.error('Error loading Internal Hard Drive data:', error);
    throw error;
  }
};

export const loadMonitorData = async (searchQuery?: string): Promise<Monitor[]> => {
  try {
    const monitorRef = ref(database, 'components/monitor');
    const snapshot = await get(monitorRef);
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    let items = Object.values(data);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        item.name.toLowerCase().includes(query) ||
        (item.resolution && item.resolution.toLowerCase().includes(query)) ||
        (item.panel_type && item.panel_type.toLowerCase().includes(query))
      );
    }

    return items.map(mapMonitorData);
  } catch (error) {
    console.error('Error loading Monitor data:', error);
    throw error;
  }
};
