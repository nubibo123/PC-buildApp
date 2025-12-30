import { Picker } from '@react-native-picker/picker';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import {
  CPU,
  Case,
  InternalHardDrive,
  Memory,
  Monitor,
  Motherboard,
  PowerSupply,
  VideoCard,
  loadCPUData,
  loadCaseData,
  loadInternalHardDriveData,
  loadMemoryData,
  loadMonitorData,
  loadMotherboardData,
  loadPowerSupplyData,
  loadVideoCardData
} from '../../data/csvData';
import AIChatBox from '../modals/aiChatBox';

import { AnalysisResult, analyzeBuildConfiguration } from '../../lib/aiAnalystService';
import { useAuth } from '../../lib/AuthContext';
import { saveBuild, updateBuild } from '../../lib/buildService';
import { analyzeBuildWithGemini } from '../../lib/geminiApi';
import { createPost } from '../../lib/postService';
import { checkSocketCompatibility, mapCpuToSocket } from '../../lib/socketUtils';
const DEFAULT_IMAGE = require('../../assets/images/default-avatar.png');

const CPU_MANUFACTURERS = ['All', 'AMD', 'Intel'];
const MEMORY_DDR_TYPES = ['All', 'DDR3', 'DDR4', 'DDR5'];

const MEMORY_MODULE_SIZES = [
  'All',
  '2GB', '4GB', '8GB', '16GB', '32GB', '64GB', '128GB',
  
];

const MOTHERBOARD_MANUFACTURERS = [
  'All', 'AsRock', 'Asus', 'Biostar', 'Colorful', 'ECS', 'EVGA', 'Foxconn',
  'Gigabyte', 'Intel', 'Jetway', 'MAXSUN', 'MSI', 'NZXT', 'Sapphire',
  'Supermicro', 'XFX', 'Zotac'
];

const MOTHERBOARD_SOCKETS = [
  'All', 'AM1', 'AM2', 'AM2+/AM2', 'AM3', 'AM3+', 'AM3+/AM3',
  'AM3/AM2+', 'AM3/AM2+/AM2', 'AM4', 'AM5', 'FM1', 'FM2', 'FM2+',
  'LGA775', 'LGA1150', 'LGA1151', 'LGA1155', 'LGA1156', 'LGA1200',
  'LGA1366', 'LGA1700', 'LGA1851', 'LGA2011', 'LGA2011-3',
  'LGA2011-3 Narrow', 'LGA2066', 'sTR4', 'sTRX4', '2 x G34',
  '2 x LGA1366', '2 x LGA2011', '2 x LGA2011-3',
  '2 x LGA2011-3 Narrow', 'Integrated A4-5000',
  'Integrated Athlon II X2 215', 'Integrated Atom 230',
  'Integrated Atom 330', 'Integrated Atom C2358',
  'Integrated Atom C2550', 'Integrated Atom C2750',
  'Integrated Atom D410', 'Integrated Atom D425',
  'Integrated Atom D510', 'Integrated Atom D525',
  'Integrated Atom D2500', 'Integrated Atom D2550',
  'Integrated Atom D2700', 'Integrated Atom N550',
  'Integrated C-Series C-70', 'Integrated Celeron 847',
  'Integrated Celeron 1037U', 'Integrated Celeron J1900',
  'Integrated Celeron N3050', 'Integrated Celeron N3150',
  'Integrated E-Series E-350', 'Integrated E-Series E-450',
  'Integrated Pentium J3710', 'Integrated Pentium N3700',
  'Integrated Xeon D-1520', 'Integrated Xeon D-1521',
  'Integrated Xeon D-1537', 'Integrated Xeon D-1541'
];

const CPU_SERIES = [
  'All',
  'AMD A4', 'AMD A6', 'AMD A8', 'AMD A10', 'AMD A12',
  'AMD Athlon', 'AMD Athlon II', 'AMD Athlon II X2', 'AMD Athlon II X3', 'AMD Athlon II X4',
  'AMD Athlon X2', 'AMD Athlon X4', 'AMD E2-Series', 'AMD EPYC', 'AMD FX',
  'AMD Opteron', 'AMD Phenom II X2', 'AMD Phenom II X3', 'AMD Phenom II X4', 'AMD Phenom II X6',
  'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 5 PRO', 'AMD Ryzen 7', 'AMD Ryzen 7 PRO',
  'AMD Ryzen 9', 'AMD Ryzen 9 PRO', 'AMD Sempron', 'AMD Sempron X2', 'AMD Threadripper',
  'Intel Celeron', 'Intel Core 2 Duo', 'Intel Core 2 Extreme', 'Intel Core 2 Quad',
  'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i7 Extreme', 'Intel Core i9',
  'Intel Core Ultra 5', 'Intel Core Ultra 7', 'Intel Core Ultra 9',
  'Intel Pentium', 'Intel Pentium Gold', 'Intel Processor',
  'Intel Xeon E', 'Intel Xeon E3', 'Intel Xeon E5'
];

type PartData = CPU | Memory | Motherboard | VideoCard | Case | PowerSupply | InternalHardDrive | Monitor;

export interface BuildConfiguration {
  cpu: CPU | null;
  memory: Memory | null;
  motherboard: Motherboard | null;
  videoCard: VideoCard | null;
  case: Case | null;
  powerSupply: PowerSupply | null;
  internalHardDrive: InternalHardDrive | null;
  monitor: Monitor | null;
}


const Build = () => {
  const { user } = useAuth();
  
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const [availableParts, setAvailableParts] = useState<PartData[]>([]);
  const [userProfile] = useState(() => ({
    displayName: user?.displayName || user?.email?.split('@')[0] || 'User',
    photoURL: user?.photoURL || '',
    email: user?.email || ''
  }));
  const [editBuildId, setEditBuildId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatInitial, setAiChatInitial] = useState<string | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Initialize buildConfig with null values
  const [buildConfig, setBuildConfig] = useState<BuildConfiguration>(() => {
    if (params.initialConfig) {
      try {
        const config = JSON.parse(params.initialConfig as string);
        setEditBuildId(params.editBuildId as string);
        return {
          cpu: config.cpu || null,
          memory: config.memory || null,
          motherboard: config.motherboard || null,
          videoCard: config.videoCard || null,
          case: config.case || null,
          powerSupply: config.powerSupply || null,
          internalHardDrive: config.internalHardDrive || null,
          monitor: config.monitor || null,
        };
      } catch (error) {
        console.error('Error parsing initial config:', error);
      }
    }
    return {
      cpu: null,
      memory: null,
      motherboard: null,
      videoCard: null,
      case: null,
      powerSupply: null,
      internalHardDrive: null,
      monitor: null,
    };
  });

  // Reusable empty build configuration
  const EMPTY_BUILD_CONFIG: BuildConfiguration = {
    cpu: null,
    memory: null,
    motherboard: null,
    videoCard: null,
    case: null,
    powerSupply: null,
    internalHardDrive: null,
    monitor: null,
  };

  // Fetch lại chi tiết các component khi vào edit build
  useEffect(() => {
    if (params.initialConfig) {
      const config = JSON.parse(params.initialConfig as string);
      const fetchAll = async () => {
        // Clear previous build configuration before applying a new one
        setBuildConfig(EMPTY_BUILD_CONFIG);
        const result: Partial<BuildConfiguration> = {};
        // CPU
        if (config.cpu) {
          const cpus = await loadCPUData();
          result.cpu = cpus.find((c) => c.name === config.cpu.name) || config.cpu;
        }
        // Memory
        if (config.memory) {
          const memories = await loadMemoryData();
          result.memory = memories.find((m) => m.name === config.memory.name) || config.memory;
        }
        // Motherboard
        if (config.motherboard) {
          const motherboards = await loadMotherboardData();
          result.motherboard = motherboards.find((m) => m.name === config.motherboard.name) || config.motherboard;
        }
        // Video Card
        if (config.videoCard) {
          const gpus = await loadVideoCardData();
          result.videoCard = gpus.find((g) => g.name === config.videoCard.name) || config.videoCard;
        }
        // Case
        if (config.case) {
          const cases = await loadCaseData();
          result.case = cases.find((c) => c.name === config.case.name) || config.case;
        }
        // Power Supply
        if (config.powerSupply) {
          const psus = await loadPowerSupplyData();
          result.powerSupply = psus.find((p) => p.name === config.powerSupply.name) || config.powerSupply;
        }
        // Internal Hard Drive
        if (config.internalHardDrive) {
          const hdds = await loadInternalHardDriveData();
          result.internalHardDrive = hdds.find((h) => h.name === config.internalHardDrive.name) || config.internalHardDrive;
        }
        // Monitor
        if (config.monitor) {
          const monitors = await loadMonitorData();
          result.monitor = monitors.find((m) => m.name === config.monitor.name) || config.monitor;
        }
        // Apply only the fetched parts on a clean slate
        setBuildConfig(() => ({ ...EMPTY_BUILD_CONFIG, ...result }));
      };
      fetchAll();
    }
  }, [params.initialConfig]);

  // Tự động chọn category có component khi edit
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (params.initialConfig) {
      try {
        const config = JSON.parse(params.initialConfig as string);
        // Tìm category đầu tiên có component được chọn
        if (config.cpu) return 'cpu';
        if (config.memory) return 'memory';
        if (config.motherboard) return 'motherboard';
        if (config.videoCard) return 'videoCard';
      } catch (error) {
        console.error('Error parsing initial config for category:', error);
      }
    }
    return 'cpu';
  });
  const [showBuildSummary, setShowBuildSummary] = useState(() => {
    // Always show build summary when editBuildId is present or when explicitly requested
    if (params.showBuildSummary === 'true' || params.editBuildId) {
      return true;
    }
    
    // Otherwise show if there are components selected
    if (params.initialConfig) {
      try {
        const config = JSON.parse(params.initialConfig as string);
        return Object.values(config).some(part => part !== null);
      } catch (error) {
        console.error('Error checking initial components:', error);
      }
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('price-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [compatibilityMessage, setCompatibilityMessage] = useState<string>('');
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);


  // Check socket compatibility whenever CPU or motherboard changes
  useEffect(() => {
    if (buildConfig.cpu && buildConfig.motherboard) {
      const isCompatible = checkSocketCompatibility(buildConfig.cpu, buildConfig.motherboard);
      const cpuSocket = buildConfig.cpu ? mapCpuToSocket(buildConfig.cpu.name, buildConfig.cpu.microarchitecture) : null;
      const motherboardSocket = buildConfig.motherboard ? buildConfig.motherboard.socket : null;
      
      setCompatibilityMessage(
        isCompatible 
          ? '✅ CPU and motherboard sockets are compatible'
          : `❌ Socket incompatible: CPU (${cpuSocket || 'N/A'}) - Motherboard (${motherboardSocket || 'N/A'})`
      );
    } else {
      setCompatibilityMessage('');
    }
  }, [buildConfig.cpu, buildConfig.motherboard]);

  // Analyze build configuration whenever components change
  useEffect(() => {
    const hasComponents = Object.values(buildConfig).some(part => part !== null);
    if (hasComponents) {
      const analysis = analyzeBuildConfiguration(buildConfig);
      setAnalysisResult(analysis);
    } else {
      setAnalysisResult(null);
    }
  }, [buildConfig]);

  const handleImageError = (partName: string) => {
    setImageLoadErrors(prev => ({
      ...prev,
      [partName]: true
    }));
  };
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  
  // CPU filters
  const [selectedManufacturer, setSelectedManufacturer] = useState('All');
  const [selectedSeries, setSelectedSeries] = useState('All');
  const [minCoreCount, setMinCoreCount] = useState('');
  const [minThreadCount, setMinThreadCount] = useState('');
  const [minCoreClock, setMinCoreClock] = useState('');
  const [maxTDP, setMaxTDP] = useState('');

  // Memory filters
  const [selectedDDRType, setSelectedDDRType] = useState('All');
  const [minSpeed, setMinSpeed] = useState('');
  const [selectedModuleSize, setSelectedModuleSize] = useState('All');

  // Motherboard filters
  const [selectedMotherboardManufacturer, setSelectedMotherboardManufacturer] = useState('All');
  const [selectedSocketCpu, setSelectedSocketCpu] = useState('All');

  const categories = [
    { id: 'cpu', name: 'CPU', loadData: loadCPUData, icon: '🖥️' },
    { id: 'memory', name: 'Memory', loadData: loadMemoryData, icon: '💾' },
    { id: 'motherboard', name: 'Motherboard', loadData: loadMotherboardData, icon: '🔌' },
    { id: 'videoCard', name: 'Video Card', loadData: loadVideoCardData, icon: '🎮' },
    { id: 'case', name: 'Case', loadData: loadCaseData, icon: '📦' },
    { id: 'powerSupply', name: 'Power Supply', loadData: loadPowerSupplyData, icon: '⚡' },
    { id: 'internalHardDrive', name: 'Internal Hard Drive', loadData: loadInternalHardDriveData, icon: '💽' },
    { id: 'monitor', name: 'Monitor', loadData: loadMonitorData, icon: '🖥' },
  ];

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const loadParts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const category = categories.find(c => c.id === selectedCategory);
        if (category) {
          // Chỉ truyền searchQuery khi thực sự cần search
          const data = await category.loadData(searchQuery || undefined);
          let filteredData = data.filter(part => part.price > 0);
          if (category.id === 'case' || category.id === 'powerSupply' || 
              category.id === 'internalHardDrive' || category.id === 'monitor') {
            filteredData = filteredData.slice(0, 50); // Limit results for new components
          }

          // Apply price filter
          if (minPrice) {
            filteredData = filteredData.filter(part => 
              part.price >= parseFloat(minPrice)
            );
          }
          if (maxPrice) {
            filteredData = filteredData.filter(part => 
              part.price <= parseFloat(maxPrice)
            );
          }

          // Apply category-specific filters
          if (selectedCategory === 'cpu') {
            if (selectedManufacturer && selectedManufacturer !== 'All') {
              const query = selectedManufacturer.toLowerCase();
              filteredData = filteredData.filter(part => 
                (part as CPU).name.toLowerCase().includes(query)
              );
            }
            if (selectedSeries && selectedSeries !== 'All') {
              const query = selectedSeries.toLowerCase();
              filteredData = filteredData.filter(part => 
                (part as CPU).name.toLowerCase().includes(query)
              );
            }
            if (minCoreCount) {
              filteredData = filteredData.filter(part => 
                (part as CPU).core_count >= parseInt(minCoreCount)
              );
            }
            if (minThreadCount) {
              filteredData = filteredData.filter(part => 
                (part as CPU).thread_count >= parseInt(minThreadCount)
              );
            }
            if (minCoreClock) {
              filteredData = filteredData.filter(part => 
                (part as CPU).core_clock >= parseInt(minCoreClock)
              );
            }
            if (maxTDP) {
              filteredData = filteredData.filter(part => 
                (part as CPU).tdp <= parseInt(maxTDP)
              );
            }
          } else if (selectedCategory === 'memory') {
            filteredData = filteredData.filter(part => {
              const memoryPart = part as Memory;
              if (selectedDDRType !== 'All' && !memoryPart.name.toLowerCase().includes(selectedDDRType.toLowerCase())) {
                return false;
              }
              if (minSpeed) {
                const speedNumber = parseInt(memoryPart.speed.replace(/\D/g, ''));
                if (isNaN(speedNumber) || speedNumber < parseInt(minSpeed)) {
                  return false;
                }
              }
              if (selectedModuleSize !== 'All' && !memoryPart.name.toLowerCase().includes(selectedModuleSize.toLowerCase())) {
                return false;
              }
              return true;
            });
          } else if (selectedCategory === 'motherboard') {
            filteredData = filteredData.filter(part => {
              const motherboardPart = part as Motherboard;
              if (selectedMotherboardManufacturer !== 'All' && !motherboardPart.name.toLowerCase().includes(selectedMotherboardManufacturer.toLowerCase())) {
                return false;
              }
              if (selectedSocketCpu !== 'All' && !motherboardPart.socket.toLowerCase().includes(selectedSocketCpu.toLowerCase())) {
                return false;
              }
              return true;
            });
          }

          // Apply sorting
          filteredData.sort((a, b) => {
            switch (sortOption) {
              case 'price-asc':
                return a.price - b.price;
              case 'price-desc':
                return b.price - a.price;
              case 'name-asc':
                return a.name.localeCompare(b.name);
              case 'name-desc':
                return b.name.localeCompare(a.name);
              default:
                return 0;
            }
          });

          setAvailableParts(filteredData.slice(0, currentPage * ITEMS_PER_PAGE));
        }
      } catch (error) {
        console.error('Error loading parts:', error);
        setError('Failed to load parts. Please try again.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    };

    loadParts();
  }, [
    selectedCategory,
    searchQuery,
    minPrice,
    maxPrice,
    selectedManufacturer,
    selectedSeries,
    minCoreCount,
    minThreadCount,
    minCoreClock,
    maxTDP,
    selectedDDRType,
    minSpeed,
    selectedModuleSize,
    selectedMotherboardManufacturer,
    selectedSocketCpu,
    sortOption
  ]);

  const selectPart = (part: PartData) => {
    const newConfig = { ...buildConfig };
    
    switch (selectedCategory) {
      case 'cpu':
        newConfig.cpu = part as CPU;
        break;
      case 'memory':
        newConfig.memory = part as Memory;
        break;
      case 'motherboard':
        newConfig.motherboard = part as Motherboard;
        break;
      case 'videoCard':
        newConfig.videoCard = part as VideoCard;
        break;
      case 'case':
        newConfig.case = part as Case;
        break;
      case 'powerSupply':
        newConfig.powerSupply = part as PowerSupply;
        break;
      case 'internalHardDrive':
        newConfig.internalHardDrive = part as InternalHardDrive;
        break;
      case 'monitor':
        newConfig.monitor = part as Monitor;
        break;
    }
    
    setBuildConfig(newConfig);
    Alert.alert('Part Selected', `${part.name} has been added to your build!`);
  };

  const removePart = (category: keyof BuildConfiguration) => {
    const newConfig = { ...buildConfig };
    newConfig[category] = null;
    setBuildConfig(newConfig);
  };

  const handleSaveBuild = async (action: 'new' | 'update' | 'saveAsNew') => {
    if (!user) return;

    const userProfile = {
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || '',
      email: user.email || ''
    };
    if (!user) {
      Alert.alert('Error', 'Please sign in to save your build');
      return;
    }

    const hasComponents = Object.values(buildConfig).some(part => part !== null);
    if (!hasComponents) {
      Alert.alert('Error', 'Please add at least one component to your build');
      return;
    }

    // Check socket compatibility if both CPU and motherboard are selected
    if (buildConfig.cpu && buildConfig.motherboard) {
      const isCompatible = checkSocketCompatibility(buildConfig.cpu, buildConfig.motherboard);
      if (!isCompatible) {
        Alert.alert(
          'Compatibility Error',
          'The selected CPU and motherboard have incompatible sockets. Please select compatible components before saving.',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      if (action === 'update' && params.editBuildId) {
        await updateBuild(params.editBuildId as string, user.uid, buildConfig);
        setBuildConfig({
          cpu: null,
          memory: null,
          motherboard: null,
          videoCard: null,
          case: null,
          powerSupply: null,
          internalHardDrive: null,
          monitor: null
        });
        Alert.alert('Success', 'Your build has been updated!', [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]);
      } else {
        await saveBuild(user.uid, buildConfig, userProfile);
        setBuildConfig({
          cpu: null,
          memory: null,
          motherboard: null,
          videoCard: null,
          case: null,
          powerSupply: null,
          internalHardDrive: null,
          monitor: null
        });
        Alert.alert('Success', 'Your build has been saved!');
        if (action === 'saveAsNew') {
          router.back();
        }
      }
    } catch (error: any) {
      console.error('Error saving/updating build:', error);
      Alert.alert('Error', error.message || 'Failed to save your build. Please try again.');
    }
  };

  const getTotalPrice = () => {
    const toNum = (v: any) => {
      const n = typeof v === 'number' ? v : Number(v);
      return isFinite(n) && !isNaN(n) ? n : 0;
    };
    let total = 0;
    if (buildConfig.cpu) total += toNum(buildConfig.cpu.price);
    if (buildConfig.memory) total += toNum(buildConfig.memory.price);
    if (buildConfig.motherboard) total += toNum(buildConfig.motherboard.price);
    if (buildConfig.videoCard) total += toNum(buildConfig.videoCard.price);
    if (buildConfig.case) total += toNum(buildConfig.case.price);
    if (buildConfig.powerSupply) total += toNum(buildConfig.powerSupply.price);
    if (buildConfig.internalHardDrive) total += toNum(buildConfig.internalHardDrive.price);
    if (buildConfig.monitor) total += toNum(buildConfig.monitor.price);
    return total;
  };

  const isSocketCompatible = () => {
    if (!buildConfig.cpu || !buildConfig.motherboard) return true;
    return checkSocketCompatibility(buildConfig.cpu, buildConfig.motherboard);
  };

  const getSelectedPartForCategory = (categoryId: string) => {
    switch (categoryId) {
      case 'cpu': return buildConfig.cpu;
      case 'memory': return buildConfig.memory;
      case 'motherboard': return buildConfig.motherboard;
      case 'videoCard': return buildConfig.videoCard;
      case 'case': return buildConfig.case;
      case 'powerSupply': return buildConfig.powerSupply;
      case 'internalHardDrive': return buildConfig.internalHardDrive;
      case 'monitor': return buildConfig.monitor;
      default: return null;
    }
  };

  const renderPartDetails = (part: PartData, categoryId: string) => {
    switch (categoryId) {
      case 'cpu':
        const cpuPart = part as CPU;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Manufacturer:</Text>
              <Text style={styles.detailValue}>{cpuPart.manufacturer}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Series:</Text>
              <Text style={styles.detailValue}>{cpuPart.series}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Core Count:</Text>
              <Text style={styles.detailValue}>{cpuPart.core_count}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Thread Count:</Text>
              <Text style={styles.detailValue}>{cpuPart.thread_count}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Core Clock:</Text>
              <Text style={styles.detailValue}>{cpuPart.core_clock} MHz</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Boost Clock:</Text>
              <Text style={styles.detailValue}>{cpuPart.boost_clock} MHz</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>TDP:</Text>
              <Text style={styles.detailValue}>{cpuPart.tdp}W</Text>
            </View>
          </View>
        );
      case 'memory':
        const memoryPart = part as Memory;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Speed:</Text>
              <Text style={styles.detailValue}>{memoryPart.speed}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Modules:</Text>
              <Text style={styles.detailValue}>{memoryPart.modules}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>CAS Latency:</Text>
              <Text style={styles.detailValue}>{memoryPart.cas_latency}</Text>
            </View>
          </View>
        );
      case 'motherboard':
        const motherboardPart = part as Motherboard;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Socket:</Text>
              <Text style={styles.detailValue}>{motherboardPart.socket}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Form Factor:</Text>
              <Text style={styles.detailValue}>{motherboardPart.form_factor}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Max Memory:</Text>
              <Text style={styles.detailValue}>{motherboardPart.max_memory}GB</Text>
            </View>
          </View>
        );
      case 'videoCard':
        const gpuPart = part as VideoCard;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Chipset:</Text>
              <Text style={styles.detailValue}>{gpuPart.chipset}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Memory:</Text>
              <Text style={styles.detailValue}>{gpuPart.memory}GB</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Core Clock:</Text>
              <Text style={styles.detailValue}>{gpuPart.core_clock} MHz</Text>
            </View>
          </View>
        );
      case 'case':
        const casePart = part as Case;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{casePart.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Color:</Text>
              <Text style={styles.detailValue}>{casePart.color}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>PSU:</Text>
              <Text style={styles.detailValue}>{casePart.psu || 'None'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Side Panel:</Text>
              <Text style={styles.detailValue}>{casePart.side_panel}</Text>
            </View>
          </View>
        );
      case 'powerSupply':
        const psuPart = part as PowerSupply;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{psuPart.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Efficiency:</Text>
              <Text style={styles.detailValue}>{psuPart.efficiency}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Wattage:</Text>
              <Text style={styles.detailValue}>{psuPart.wattage}W</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Modular:</Text>
              <Text style={styles.detailValue}>{psuPart.modular}</Text>
            </View>
          </View>
        );
      case 'internalHardDrive':
        const drivePart = part as InternalHardDrive;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Capacity:</Text>
              <Text style={styles.detailValue}>{drivePart.capacity}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>{drivePart.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cache:</Text>
              <Text style={styles.detailValue}>{drivePart.cache || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Form Factor:</Text>
              <Text style={styles.detailValue}>{drivePart.form_factor}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Interface:</Text>
              <Text style={styles.detailValue}>{drivePart.interface}</Text>
            </View>
          </View>
        );
      case 'monitor':
        const monitorPart = part as Monitor;
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Resolution:</Text>
              <Text style={styles.detailValue}>{monitorPart.resolution}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size:</Text>
              <Text style={styles.detailValue}>{monitorPart.size}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Refresh Rate:</Text>
              <Text style={styles.detailValue}>{monitorPart.refresh_rate}Hz</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Response Time:</Text>
              <Text style={styles.detailValue}>{monitorPart.response_time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Panel Type:</Text>
              <Text style={styles.detailValue}>{monitorPart.panel_type}</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const renderMemoryFilters = () => {
    if (selectedCategory !== 'memory') return null;

    return (
      <View style={styles.memoryFiltersContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>DDR Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MEMORY_DDR_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.filterButton, selectedDDRType === type && styles.selectedFilter]}
                onPress={() => setSelectedDDRType(type)}
              >
                <Text style={[styles.filterButtonText, selectedDDRType === type && styles.selectedFilterText]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Module Size</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MEMORY_MODULE_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.filterButton, selectedModuleSize === size && styles.selectedFilter]}
                onPress={() => setSelectedModuleSize(size)}
              >
                <Text style={[styles.filterButtonText, selectedModuleSize === size && styles.selectedFilterText]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Performance</Text>
          <View style={styles.filterGrid}>
            <View style={styles.filterGridItem}>
              <Text style={styles.filterLabel}>Speed (MHz)</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="Min"
                value={minSpeed}
                onChangeText={setMinSpeed}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderMotherboardFilters = () => {
    if (selectedCategory !== 'motherboard') return null;

    return (
      <View style={styles.memoryFiltersContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Manufacturer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MOTHERBOARD_MANUFACTURERS.map((manufacturer) => (
              <TouchableOpacity
                key={manufacturer}
                style={[styles.filterButton, selectedMotherboardManufacturer === manufacturer && styles.selectedFilter]}
                onPress={() => setSelectedMotherboardManufacturer(manufacturer)}
              >
                <Text style={[styles.filterButtonText, selectedMotherboardManufacturer === manufacturer && styles.selectedFilterText]}>
                  {manufacturer}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Socket / CPU</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MOTHERBOARD_SOCKETS.map((socket) => (
              <TouchableOpacity
                key={socket}
                style={[styles.filterButton, selectedSocketCpu === socket && styles.selectedFilter]}
                onPress={() => setSelectedSocketCpu(socket)}
              >
                <Text style={[styles.filterButtonText, selectedSocketCpu === socket && styles.selectedFilterText]}>
                  {socket}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderCPUFilters = () => {
    if (selectedCategory !== 'cpu') return null;

    return (
      <View style={styles.cpuFiltersContainer}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Manufacturer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CPU_MANUFACTURERS.map((manufacturer) => (
              <TouchableOpacity
                key={manufacturer}
                style={[styles.filterButton, selectedManufacturer === manufacturer && styles.selectedFilter]}
                onPress={() => setSelectedManufacturer(manufacturer)}
              >
                <Text style={[styles.filterButtonText, selectedManufacturer === manufacturer && styles.selectedFilterText]}>
                  {manufacturer}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Series</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CPU_SERIES.map((series) => (
              <TouchableOpacity
                key={series}
                style={[styles.filterButton, selectedSeries === series && styles.selectedFilter]}
                onPress={() => setSelectedSeries(series)}
              >
                <Text style={[styles.filterButtonText, selectedSeries === series && styles.selectedFilterText]}>
                  {series}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Performance</Text>
          <View style={styles.filterGrid}>
            <View style={styles.filterGridItem}>
              <Text style={styles.filterLabel}>Core Count</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="Min"
                value={minCoreCount}
                onChangeText={setMinCoreCount}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterGridItem}>
              <Text style={styles.filterLabel}>Thread Count</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="Min"
                value={minThreadCount}
                onChangeText={setMinThreadCount}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterGridItem}>
              <Text style={styles.filterLabel}>Core Clock (MHz)</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="Min"
                value={minCoreClock}
                onChangeText={setMinCoreClock}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterGridItem}>
              <Text style={styles.filterLabel}>Max TDP (W)</Text>
              <TextInput
                style={styles.numberInput}
                placeholder="Max"
                value={maxTDP}
                onChangeText={setMaxTDP}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const handleGeminiAnalyze = async () => {
    setGeminiLoading(true);
    setGeminiError(null);
    setGeminiAnalysis(null);
    try {
      const result = await analyzeBuildWithGemini(buildConfig);
      setGeminiAnalysis(result);
    } catch (e: any) {
      setGeminiError(e.message || 'Gemini API error');
    } finally {
      setGeminiLoading(false);
    }
  };

  const renderBuildSummary = () => {
    console.log('editBuildId:', params.editBuildId);
    console.log('showBuildSummary:', showBuildSummary);
    return (
      <View style={styles.buildSummary}>
        <Text style={styles.buildTitle}>Your Build Configuration</Text>
        {categories.map((category) => {
          const selectedPart = getSelectedPartForCategory(category.id);
          const price = selectedPart ? selectedPart.price : 0;
          return (
            <View key={category.id} style={styles.buildItem}>
              <View style={styles.buildItemHeader}>
                <Text style={styles.buildItemTitle}>
                  {category.icon} {category.name}
                </Text>
                {selectedPart && (
                  <TouchableOpacity
                    onPress={() => removePart(category.id as keyof BuildConfiguration)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
              {selectedPart ? (
                <View style={styles.selectedPartInfo}>
                  <Text style={styles.selectedPartName}>{selectedPart.name}</Text>
                  <Text style={styles.selectedPartPrice}>${(typeof selectedPart.price === 'number' ? selectedPart.price : Number(selectedPart.price) || 0).toFixed(2)}</Text>
                </View>
              ) : (
                <Text style={styles.noPartSelected}>No part selected</Text>
              )}
            </View>
          );
        })}
        {/* Compatibility Message */}
        {compatibilityMessage && (
          <View style={[styles.compatibilityMessage, compatibilityMessage.includes('❌') && styles.incompatibleMessage]}>
            <Text style={styles.compatibilityText}>{compatibilityMessage}</Text>
          </View>
        )}

        {/* Total price above AI Analyst */}
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.totalPriceText}>Total Price: ${getTotalPrice().toFixed(2)}</Text>
        </View>

        {/* AI Analyst Section */}
        {analysisResult && (
          <View style={styles.analysisContainer}>
            <Text style={styles.analysisTitle}>🤖 AI Build Analysis</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Overall Score: {analysisResult.overallScore}/100</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreProgress, { width: `${analysisResult.overallScore}%` }]} />
              </View>
              <View style={{ marginTop: 16 }}>
                <Text style={styles.scoreLabel}>Gaming: {analysisResult.performance.gaming}/100</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreProgress, { width: `${analysisResult.performance.gaming}%`, backgroundColor: '#1976d2' }]} />
                </View>
                <Text style={styles.scoreLabel}>Workstation: {analysisResult.performance.workstation}/100</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreProgress, { width: `${analysisResult.performance.workstation}%`, backgroundColor: '#FFA500' }]} />
                </View>
                <Text style={styles.scoreLabel}>General: {analysisResult.performance.general}/100</Text>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreProgress, { width: `${analysisResult.performance.general}%`, backgroundColor: '#4CAF50' }]} />
                </View>
              </View>
              <Text style={styles.scoreValue}>Compatibility: {analysisResult.compatibility.status === 'compatible' ? '✅ Compatible' : analysisResult.compatibility.status === 'warning' ? '⚠️ Warning' : '❌ Incompatible'}</Text>
              {analysisResult.compatibility.issues.length > 0 && (
                <Text style={[styles.scoreValue, { color: '#ff4444' }]}>Issues: {analysisResult.compatibility.issues.join(', ')}</Text>
              )}
              <Text style={styles.scoreValue}>Price Efficiency: {analysisResult.priceEfficiency}/100</Text>
            </View>
            <View style={styles.powerContainer}>
              <Text style={styles.powerEstimate}>Estimated Power: {analysisResult.powerConsumption.estimated}W</Text>
              <Text style={styles.powerRecommendation}>{analysisResult.powerConsumption.recommendation}</Text>
            </View>
            {analysisResult.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.sectionTitle}>💡 Recommendations:</Text>
                {analysisResult.recommendations.map((rec, idx) => (
                  <Text key={idx} style={styles.recommendation}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Gemini Analysis Section */}
        <View style={{ marginVertical: 10 }}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#ff9800', marginBottom: 8 }]}
            onPress={handleGeminiAnalyze}
            disabled={geminiLoading}
          >
            <Text style={styles.saveButtonText}>
              {geminiLoading ? 'Analyzing with Gemini...' : 'Analyze with Gemini AI'}
            </Text>
          </TouchableOpacity>
          {geminiError && (
            <Text style={{ color: 'red', marginBottom: 8 }}>{geminiError}</Text>
          )}
          {geminiAnalysis && (
            <View style={{ backgroundColor: '#fffde7', borderRadius: 8, padding: 12, marginTop: 4 }}>
              <Markdown
                style={{
                  body: { color: '#333', fontSize: 15 },
                  strong: { fontWeight: 'bold' },
                  em: { fontStyle: 'italic' },
                  bullet_list: { marginLeft: 16 },
                  list_item: { flexDirection: 'row', alignItems: 'flex-start' },
                  paragraph: { marginBottom: 8 },
                }}
              >
                {stripHtmlTags(geminiAnalysis)}
              </Markdown>
            </View>
          )}
        </View>

        {/* Gemini Sample Questions */}
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 6, color: '#1976d2' }}>Sample questions for Gemini AI:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
            {geminiSampleQuestions.map((q: string, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={{
                  backgroundColor: '#e3f2fd',
                  borderRadius: 16,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: '#1976d2',
                }}
                onPress={() => {
                  setAiChatInitial(q);
                  setShowAIChat(true);
                }}
              >
                <Text style={{ color: '#1976d2', fontSize: 14 }}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.totalPrice}>
          <TouchableOpacity style={[styles.saveButton, {marginBottom: 10, backgroundColor: '#1976d2'}]} onPress={() => { setAiChatInitial(null); setShowAIChat(true); }}>
            <Text style={styles.saveButtonText}>Ask Gemini AI</Text>
          </TouchableOpacity>
          <AIChatBox visible={showAIChat} onClose={() => setShowAIChat(false)} initialQuestion={aiChatInitial} buildConfig={buildConfig} />
          {!isSocketCompatible() && (
            <Text style={{ color: '#d32f2f', fontWeight: 'bold', marginBottom: 6 }}>
              ❌ CPU and Motherboard sockets are incompatible. Please adjust before saving.
            </Text>
          )}
          <View style={styles.actionButtons}>
            <View>
              {params.editBuildId ? (
                <>
                  <TouchableOpacity
                    style={[styles.saveButton, styles.updateButton]}
                    onPress={() => handleSaveBuild('update')}
                    disabled={!isSocketCompatible()}
                  >
                    <Text style={styles.saveButtonTextSmall}>Update Build</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, styles.saveAsNewButton]}
                    onPress={() => handleSaveBuild('saveAsNew')}
                    disabled={!isSocketCompatible()}
                  >
                    <Text style={styles.saveButtonTextSmall}>Save as New Build</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleSaveBuild('new')}
                  disabled={!isSocketCompatible()}
                >
                  <Text style={styles.saveButtonText}>Save Build</Text>
                </TouchableOpacity>
              )}
              <View style={styles.createPostSection}>
                <TouchableOpacity
                  style={[styles.saveButton, styles.createPostButton]}
                  onPress={async () => {
                    if (!user) {
                      Alert.alert('Error', 'Please sign in to create a post');
                      return;
                    }
                    try {
                      // Auto-generate a simple title/description
                      const title = 'My PC Build';
                      const description = 'Created from Build Summary';
                      await createPost(user.uid, buildConfig, title, description, userProfile);
                      Alert.alert('Success', 'Your post has been created!');
                    } catch (error) {
                      let message = 'Failed to create post. Please try again.';
                      if (error && typeof error === 'object' && 'message' in error) {
                        message = (error as any).message;
                      }
                      Alert.alert('Error', message);
                    }
                  }}
                >
                  <Text style={styles.saveButtonText}>Create Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
    };

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Build Your PC' }} />
        
        {/* Toggle between parts selection and build summary */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, !showBuildSummary && styles.activeToggle]}
            onPress={() => setShowBuildSummary(false)}
          >
            <Text style={[styles.toggleText, !showBuildSummary && styles.activeToggleText]}>
              Select Parts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, showBuildSummary && styles.activeToggle]}
            onPress={() => setShowBuildSummary(true)}
          >
            <Text style={[styles.toggleText, showBuildSummary && styles.activeToggleText]}>
              Build Summary ({Object.values(buildConfig).filter(part => part !== null).length}/8)
            </Text>
          </TouchableOpacity>
        </View>

        {showBuildSummary ? (
          <ScrollView style={styles.content}>
            {renderBuildSummary()}
          </ScrollView>
        ) : (
          <>
            {/* Search and Filters */}
            <View style={styles.filtersHeader}>
              <TouchableOpacity 
                style={styles.filterToggle}
                onPress={() => setIsFiltersExpanded(!isFiltersExpanded)}
              >
                <Text style={styles.filterToggleText}>
                  {isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
                </Text>
              </TouchableOpacity>
            </View>

          <View style={[styles.filtersSection, !isFiltersExpanded && styles.collapsedFiltersSection]}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search parts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={styles.priceFilter}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min $"
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max $"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.sortContainer}>
                <Picker
                  selectedValue={sortOption}
                  onValueChange={(value) => setSortOption(value)}
                  style={styles.sortPicker}
                >
                  <Picker.Item label="Price: Low to High" value="price-asc" />
                  <Picker.Item label="Price: High to Low" value="price-desc" />
                  <Picker.Item label="Name: A to Z" value="name-asc" />
                  <Picker.Item label="Name: Z to A" value="name-desc" />
                </Picker>
              </View>
            </View>

            {renderCPUFilters()}
            {renderMemoryFilters()}
            {renderMotherboardFilters()}
          </View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((category) => {
              const selectedPart = getSelectedPartForCategory(category.id);
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.selectedCategory,
                    selectedPart && styles.categoryWithSelection,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.selectedCategoryText,
                  ]}>
                    {category.name}
                  </Text>
                  {selectedPart && <Text style={styles.selectedIndicator}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Parts List */}
          <ScrollView 
            style={styles.partsContainer}
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
              
              if (isCloseToBottom && !isLoadingMore && availableParts.length >= currentPage * ITEMS_PER_PAGE) {
                setIsLoadingMore(true);
                setCurrentPage(prev => prev + 1);
              }
            }}
            scrollEventThrottle={400}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading parts...</Text>
              </View>
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : availableParts.length === 0 ? (
              <Text style={styles.noResults}>No parts available.</Text>
            ) : (
              availableParts.map((part, index) => {
                const isSelected = getSelectedPartForCategory(selectedCategory)?.name === part.name;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.partCard, isSelected && styles.selectedPartCard]}
                    onPress={() => selectPart(part)}
                  >
                    <View style={styles.partImageContainer}>
                      <Image
                        source={(() => {
                          if (imageLoadErrors[part.name]) return DEFAULT_IMAGE;
                          // Ưu tiên image_link, fallback sang link_image, cuối cùng là ảnh mặc định
                          const image_link = (part as any).image_link || (part as any).link_image;
                          return image_link ? { uri: image_link } : DEFAULT_IMAGE;
                        })()}
                        style={styles.partImage}
                        onError={() => handleImageError(part.name)}
                      />
                    </View>
                    <View style={styles.partInfo}>
                      <Text style={styles.partName} numberOfLines={2}>{part.name}</Text>
                      <Text style={styles.partPrice}>${(typeof part.price === 'number' ? part.price : Number(part.price) || 0).toFixed(2)}</Text>
                      {renderPartDetails(part, selectedCategory)}
                      {isSelected && (
                        <Text style={styles.selectedLabel}>✓ Selected</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {isLoadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

const styles = StyleSheet.create({
  createPostButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
  },
  compatibilityMessage: {
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: '#e6ffe6',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  incompatibleMessage: {
    backgroundColor: '#ffe6e6',
    borderColor: '#FF5252',
  },
  compatibilityText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  loadingMoreContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingMoreText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 25,
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeToggleText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    paddingVertical: 15, // Giảm padding dọc từ 50 xuống 15
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    maxHeight: 120,
  },
  categoryButton: {
    paddingHorizontal: 12, // Giảm padding ngang
    paddingVertical: 8, // Giảm padding dọc
    marginRight: 8, // Giảm margin
    borderRadius: 16, // Giảm border radius để phù hợp với kích thước mới
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    minWidth: 70, // Giảm minWidth
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
  },
  categoryWithSelection: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  selectedIndicator: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  partsContainer: {
    flex: 1,
    padding: 15,
  },
  partCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  selectedPartCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  partImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  partInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  partName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1a237e',
    letterSpacing: 0.1,
  },
  partPrice: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: '700',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#607d8b',
    marginBottom: 2,
  },
  selectedLabel: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 5,
  },
  buildSummary: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  buildTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1a237e',
    letterSpacing: 0.2,
  },
  buildItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  buildItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  buildItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976d2',
    letterSpacing: 0.1,
  },
  removeButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedPartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  selectedPartName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: 'bold',
  },
  selectedPartPrice: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '700',
  },
  noPartSelected: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  totalPrice: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    padding: 20,
    marginTop: 10,
    alignItems: 'center',
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  totalPriceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000ff',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    elevation: 2,
  },
  updateButton: {
    backgroundColor: '#FFA500',
  },
  saveAsNewButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButtonTextSmall: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#ff4444',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  noResults: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  filtersHeader: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    marginBottom: 0,
  },
  filterToggle: {
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#1976d2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  filterToggleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filtersSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderRadius: 14,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  collapsedFiltersSection: {
    maxHeight: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  searchContainer: {
    marginVertical: 8,
  },
  searchInput: {
    backgroundColor: '#f1f3f6',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  priceFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2, // Make it wider to avoid overlap
    marginRight: 10,
    backgroundColor: '#f1f3f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 180, // Ensure enough width for both inputs
  },
  priceInput: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    width: 70,
    fontSize: 14,
    borderWidth: 0,
    color: '#333',
    flex: 1, // Allow both inputs to share space
  },
  priceSeparator: {
    marginHorizontal: 8,
    color: '#607d8b',
    fontWeight: 'bold',
    fontSize: 18,
    flexShrink: 0,
  },
  sortContainer: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#f1f3f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 120,
  },
  sortPicker: {
    height: 36,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  createPostSection: {
    marginTop: 10,
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
  },
  analysisContainer: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  analysisTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2c3e50',
  },
  scoreContainer: {
    marginBottom: 20,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  scoreBar: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  scoreValue: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'right',
  },
  performanceContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  performanceScores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  performanceLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  powerContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  powerEstimate: {
    fontSize: 15,
    color: '#34495e',
    marginBottom: 5,
  },
  powerRecommendation: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  priceEfficiencyContainer: {
    marginBottom: 20,
  },
  recommendationsContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendation: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  descriptionInput: {
    height: 120,
    textAlignVertical: 'top',
  },

  cpuFiltersContainer: {
    marginBottom: 10,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a237e',
    letterSpacing: 0.2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedFilter: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  filterGridItem: {
    flex: 1,
    minWidth: '45%',
    margin: 5,
  },
  filterLabel: {
    fontSize: 13,
    color: '#607d8b',
    marginBottom: 4,
  },
  numberInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  memoryFiltersContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsContainer: {
    marginTop: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 13,
    color: '#607d8b',
    width: 100,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  partImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f3f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
});

// Hàm loại bỏ các thẻ HTML đơn giản
function stripHtmlTags(str: string): string {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, '');
}

const geminiSampleQuestions: string[] = [
  'Can this build run AAA games well?',
  'Should I upgrade the RAM for this build?',
  'Is this build suitable for graphic design work?',
  'Is the power supply sufficient for this system?',
  'Is there any component bottleneck in this build?',
  'Advice on upgrading CPU or GPU for this build?',
  'Is this build good for livestreaming?',
  'Any suggestions to optimize performance/cost?',
  'Is this build compatible with Windows 11?',
  'Recommend a suitable monitor for this build.'
];


export default Build;