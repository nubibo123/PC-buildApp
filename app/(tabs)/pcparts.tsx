import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
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
  loadVideoCardData,
} from '../../data/csvData';

type PartData = CPU | Memory | Motherboard | VideoCard | Case | PowerSupply | InternalHardDrive | Monitor;
type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

const ITEMS_PER_PAGE = 50;
const DEFAULT_IMAGE = require('../../assets/images/default-avatar.png');

const CPU_MANUFACTURERS = ['All', 'AMD', 'Intel'];
const MEMORY_DDR_TYPES = ['All', 'DDR3', 'DDR4', 'DDR5'];

const MEMORY_MODULE_SIZES = [
  'All',
  '2GB', '4GB', '8GB', '16GB', '32GB', '64GB', '128GB',
  '2x2GB', '2x4GB', '2x8GB', '2x16GB', '2x32GB',
  '4x2GB', '4x4GB', '4x8GB', '4x16GB', '4x32GB'
];

const MOTHERBOARD_MANUFACTURERS = [
  'All', 'ASRock', 'Asus', 'Biostar', 'Colorful', 'ECS', 'EVGA', 'Foxconn',
  'Gigabyte', 'Intel', 'Jetway', 'MAXSUN', 'MSI', 'NZXT', 'Sapphire',
  'Supermicro', 'XFX', 'Zotac'
];

const MOTHERBOARD_SOCKETS = [
  'All', 'AM1', 'AM2', 'AM2+/AM2', 'AM3', 'AM3+', 'AM3+/AM3', 'AM3/AM2+',
  'AM3/AM2+/AM2', 'AM4', 'AM5', 'FM1', 'FM2', 'FM2+', 'LGA775', 'LGA1150',
  'LGA1151', 'LGA1155', 'LGA1156', 'LGA1200', 'LGA1366', 'LGA1700', 'LGA1851',
  'LGA2011', 'LGA2011-3', 'LGA2011-3 Narrow', 'LGA2066', 'sTR4', 'sTRX4',
  '2 x G34', '2 x LGA1366', '2 x LGA2011', '2 x LGA2011-3',
  '2 x LGA2011-3 Narrow', 'Integrated A4-5000', 'Integrated Athlon II X2 215',
  'Integrated Atom 230', 'Integrated Atom 330', 'Integrated Atom C2358',
  'Integrated Atom C2550', 'Integrated Atom C2750', 'Integrated Atom D410',
  'Integrated Atom D425', 'Integrated Atom D510', 'Integrated Atom D525',
  'Integrated Atom D2500', 'Integrated Atom D2550', 'Integrated Atom D2700',
  'Integrated Atom N550', 'Integrated C-Series C-70', 'Integrated Celeron 847',
  'Integrated Celeron 1037U', 'Integrated Celeron J1900', 'Integrated Celeron N3050',
  'Integrated Celeron N3150', 'Integrated E-Series E-350', 'Integrated E-Series E-450',
  'Integrated Pentium J3710', 'Integrated Pentium N3700', 'Integrated Xeon D-1520',
  'Integrated Xeon D-1521', 'Integrated Xeon D-1537', 'Integrated Xeon D-1541'
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

const PCParts = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('cpu');
  const [parts, setParts] = useState<PartData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('price-asc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
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

  // Case filters
  const [selectedCaseType, setSelectedCaseType] = useState('All');
  const [selectedCaseColor, setSelectedCaseColor] = useState('All');

  // Power Supply filters
  const [selectedPSUType, setSelectedPSUType] = useState('All');
  const [minWattage, setMinWattage] = useState('');
  const [selectedModular, setSelectedModular] = useState('All');

  // Internal Hard Drive filters
  const [selectedDriveType, setSelectedDriveType] = useState('All');
  const [selectedFormFactor, setSelectedFormFactor] = useState('All');
  const [selectedInterface, setSelectedInterface] = useState('All');

  // Monitor filters
  const [minRefreshRate, setMinRefreshRate] = useState('');
  const [selectedPanelType, setSelectedPanelType] = useState('All');
  const [selectedResolution, setSelectedResolution] = useState('All');

  const categories = [
    { id: 'cpu', name: 'CPU', loadData: loadCPUData },
    { id: 'memory', name: 'Memory', loadData: loadMemoryData },
    { id: 'motherboard', name: 'Motherboard', loadData: loadMotherboardData },
    { id: 'video-card', name: 'Video Card', loadData: loadVideoCardData },
    { id: 'case', name: 'Case', loadData: loadCaseData },
    { id: 'power-supply', name: 'Power Supply', loadData: loadPowerSupplyData },
    { id: 'internal-hard-drive', name: 'Internal Hard Drive', loadData: loadInternalHardDriveData },
    { id: 'monitor', name: 'Monitor', loadData: loadMonitorData },
  ];

  const sortOptions = [
    { id: 'price-asc', label: 'Price: Low to High' },
    { id: 'price-desc', label: 'Price: High to Low' },
    { id: 'name-asc', label: 'Name: A to Z' },
    { id: 'name-desc', label: 'Name: Z to A' },
  ];

  useEffect(() => {
    setCurrentPage(1);
    loadParts();
  }, [selectedCategory]);

  const loadParts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const category = categories.find(c => c.id === selectedCategory);
      if (category) {
        const data = await category.loadData();
        const validParts = data.filter(part => part.price && part.price > 0);
        setParts(validParts);
      }

    } catch (error) {
      console.error('Error loading parts:', error);
      setError('Failed to load parts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sortParts = (partsToSort: PartData[]) => {
    switch (sortOption) {
      case 'price-asc':
        return [...partsToSort].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...partsToSort].sort((a, b) => b.price - a.price);
      case 'name-asc':
        return [...partsToSort].sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return [...partsToSort].sort((a, b) => b.name.localeCompare(a.name));
      default:
        return partsToSort;
    }
  };

  const filterParts = (partsToFilter: PartData[]) => {
    let filteredParts = partsToFilter;

    // Apply price filter
    if (minPrice !== '' || maxPrice !== '') {
      filteredParts = filteredParts.filter(part => {
        const price = part.price;
        const min = minPrice !== '' ? parseFloat(minPrice) : -Infinity;
        const max = maxPrice !== '' ? parseFloat(maxPrice) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Apply category-specific filters
    if (selectedCategory === 'memory') {
      filteredParts = filteredParts.filter((part) => {
        const memoryPart = part as Memory;
        


        // Speed filter
        if (minSpeed !== '') {
          const speedNumber = parseInt(memoryPart.speed.replace(/\D/g, ''));
          if (isNaN(speedNumber) || speedNumber < parseInt(minSpeed)) {
            return false;
          }
        }

        // Module Size filter
        if (selectedModuleSize !== 'All' && !memoryPart.name.toLowerCase().includes(selectedModuleSize.toLowerCase())) {
          return false;
        }

        return true;
      });
    } else if (selectedCategory === 'motherboard') {
      filteredParts = filteredParts.filter((part) => {
        const motherboardPart = part as Motherboard;

        // Manufacturer filter
        if (selectedMotherboardManufacturer !== 'All') {
          if (!motherboardPart.name.toLowerCase().includes(selectedMotherboardManufacturer.toLowerCase())) {
            return false;
          }
        }

        // Socket / CPU filter
        if (selectedSocketCpu !== 'All') {
          if (!motherboardPart.socket.toLowerCase().includes(selectedSocketCpu.toLowerCase())) {
            return false;
          }
        }

        return true;
      });
    } else if (selectedCategory === 'cpu') {
      filteredParts = filteredParts.filter((part) => {
        const cpuPart = part as CPU;
        
        // Manufacturer filter
        if (selectedManufacturer !== 'All') {
          if (!cpuPart.name.toLowerCase().includes(selectedManufacturer.toLowerCase())) {
            return false;
          }
        }

        // Series filter
        if (selectedSeries !== 'All') {
          if (!cpuPart.name.toLowerCase().includes(selectedSeries.toLowerCase())) {
            return false;
          }
        }

        // Core Count filter
        if (minCoreCount !== '' && cpuPart.core_count < parseInt(minCoreCount)) {
          return false;
        }

        // Thread Count filter
        if (minThreadCount !== '' && cpuPart.thread_count < parseInt(minThreadCount)) {
          return false;
        }

        // Core Clock filter
        if (minCoreClock !== '' && cpuPart.core_clock < parseFloat(minCoreClock)) {
          return false;
        }

        // TDP filter
        if (maxTDP !== '' && cpuPart.tdp > parseInt(maxTDP)) {
          return false;
        }

        return true;
      });
    }

    // Apply search filter
    if (!searchQuery) return filteredParts;
    const query = searchQuery.toLowerCase();
    return filteredParts.filter(part => {
      const matchName = part.name.toLowerCase().includes(query);
      switch (selectedCategory) {
        case 'cpu':
          const cpuPart = part as CPU;
          return (
            matchName ||
            cpuPart.microarchitecture.toLowerCase().includes(query) ||
            cpuPart.core_count.toString().includes(query)
          );
        case 'memory':
          const memoryPart = part as Memory;
          return (
            matchName ||
            memoryPart.speed.toLowerCase().includes(query) ||
            memoryPart.modules.toLowerCase().includes(query)
          );
        case 'motherboard':
          const motherboardPart = part as Motherboard;
          return (
            matchName ||
            motherboardPart.socket.toLowerCase().includes(query) ||
            motherboardPart.form_factor.toLowerCase().includes(query)
          );
        case 'video-card':
          const gpuPart = part as VideoCard;
          return (
            matchName ||
            gpuPart.chipset.toLowerCase().includes(query) ||
            gpuPart.memory.toString().includes(query)
          );
        default:
          return matchName;
      }
    });
  };

  const renderPartDetails = (part: PartData) => {
    switch (selectedCategory) {
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
      case 'video-card':
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
      default:
        return null;
    }
  };

  const handleImageError = (partId: string, error: any) => {
    console.log(`Image loading error for part ${partId}:`, error.nativeEvent);
    setImageLoadErrors(prev => ({ ...prev, [partId]: true }));
  };

  const renderPartItem = ({ item: part }: { item: PartData }) => {
    const hasImageError = imageLoadErrors[part.name];
    // Use link_image if available, fallback to default image for all categories (including CPU)
    const imageSource = (!hasImageError && (part as any).link_image)
      ? { uri: (part as any).link_image }
      : DEFAULT_IMAGE;

    return (
      <View style={styles.partCard}>
        <View style={styles.partImageContainer}>
          <Image
            source={imageSource}
            style={styles.partImage}
            onError={(error) => handleImageError(part.name, error)}
          />
        </View>
        <View style={styles.partInfo}>
          <Text style={styles.partName} numberOfLines={2}>{part.name}</Text>
          <Text style={styles.partPrice}>${part.price.toFixed(2)}</Text>
          {renderPartDetails(part)}
        </View>
      </View>
    );
  };

  const loadMoreItems = () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    setIsLoadingMore(false);
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const renderMemoryFilters = () => {
    if (selectedCategory !== 'memory') return null;

    return (
      <View style={styles.memoryFiltersContainer}>


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
              <Text style={styles.filterLabel}>TDP (W)</Text>
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

  const displayedParts = sortParts(filterParts(parts));
  const paginatedParts = displayedParts.slice(0, currentPage * ITEMS_PER_PAGE);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'PC Parts' }} />
      
      {/* Categories */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryButton, selectedCategory === category.id && styles.selectedCategory]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === category.id && styles.selectedCategoryText]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Filters Section */}
      <View style={[styles.filtersSection, !isFiltersExpanded && styles.collapsedFiltersSection]}>
        {/* Filter Toggle Button */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setIsFiltersExpanded(!isFiltersExpanded)}
        >
          <Text style={styles.filterToggleText}>
            {isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}
          </Text>
        </TouchableOpacity>

        {/* Collapsible Content */}
        {isFiltersExpanded && (
          <View style={styles.filterContent}>
            {/* Search Bar */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, specifications..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Price Filter */}
            <View style={styles.priceFilterContainer}>
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

            {/* Category-specific Filters */}
            {renderMemoryFilters()}
          {renderMotherboardFilters()}
          {renderCPUFilters()}

            {/* Sort Options */}
            <View style={styles.sortSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.sortButton, sortOption === option.id && styles.selectedSort]}
                    onPress={() => setSortOption(option.id as SortOption)}
                  >
                    <Text style={[styles.sortText, sortOption === option.id && styles.selectedSortText]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* Parts List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading parts...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadParts}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={paginatedParts}
          renderItem={renderPartItem}
          keyExtractor={(item) => item.name}
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.partsList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  memoryFiltersContainer: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  filterSection: {
    marginBottom: 18,
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
  filterContent: {
    width: '100%',
  },
  collapsedFiltersSection: {
    paddingVertical: 8,
    height: 44,
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingTop: 50,
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  categoriesContainer: {
    paddingHorizontal: 12,
  },
  categoryButton: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 22,
    backgroundColor: '#e3eafc',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedCategory: {
    backgroundColor: '#1976d2',
  },
  categoryText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filtersSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    backgroundColor: '#f1f3f6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  priceFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#f1f3f6',
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  priceSeparator: {
    marginHorizontal: 10,
    fontSize: 18,
    color: '#607d8b',
    fontWeight: 'bold',
  },
  cpuFiltersContainer: {
    marginBottom: 13,
  },
  sortSection: {
    marginTop: 5,
  },
  sortButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#f1f3f6',
    borderWidth: 1,
    borderColor: '#e3e3e3',
  },
  selectedSort: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  sortText: {
    fontSize: 14,
    color: '#333',
  },
  selectedSortText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  partsList: {
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
  partImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  partInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  partName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  partPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 8,
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
  filtersContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  filterRow: {
    marginBottom: 10,
  },
  filterInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipSelected: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  filterChipText: {
    fontSize: 12,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#607d8b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#607d8b',
  },
});

export default PCParts;
