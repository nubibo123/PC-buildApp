import { BuildConfiguration } from '../app/(tabs)/build';

export interface PerformanceScore {
  gaming: number;
  workstation: number;
  general: number;
}

export interface CompatibilityResult {
  status: 'compatible' | 'incompatible' | 'warning';
  issues: string[];
}

export interface PowerConsumption {
  estimated: number;
  recommendation: string;
}

export interface AnalysisResult {
  overallScore: number;
  performance: PerformanceScore;
  compatibility: CompatibilityResult;
  powerConsumption: PowerConsumption;
  priceEfficiency: number;
  recommendations: string[];
}

export function analyzeBuildConfiguration(config: BuildConfiguration): AnalysisResult {
  const performance = analyzePerformance(config);
  const compatibility = analyzeCompatibility(config);
  const powerConsumption = analyzePowerConsumption(config);
  const priceEfficiency = analyzePriceEfficiency(config);
  const recommendations = generateRecommendations(config, performance, compatibility, powerConsumption);
  
  const overallScore = calculateOverallScore(performance, compatibility, priceEfficiency);
  
  return {
    overallScore,
    performance,
    compatibility,
    powerConsumption,
    priceEfficiency,
    recommendations
  };
}

function analyzePerformance(config: BuildConfiguration): PerformanceScore {
  let gaming = 0;
  let workstation = 0;
  let general = 0;
  
  // CPU Performance Analysis
  if (config.cpu) {
    const cpu = config.cpu;
    const coreScore = Math.min(cpu.core_count * 8, 100);
    const clockScore = Math.min((cpu.core_clock / 3000) * 60, 60);
    
    general += coreScore * 0.4 + clockScore * 0.3;
    workstation += coreScore * 0.5 + clockScore * 0.3;
    gaming += Math.min(coreScore * 0.3 + clockScore * 0.4, 70);
  }
  
  // GPU Performance Analysis
  if (config.videoCard) {
    const gpu = config.videoCard;
    let gpuScore = 0;
    
    // Basic GPU scoring based on memory and name patterns
    if (gpu.memory >= 12) gpuScore = 90;
    else if (gpu.memory >= 8) gpuScore = 75;
    else if (gpu.memory >= 6) gpuScore = 60;
    else if (gpu.memory >= 4) gpuScore = 45;
    else gpuScore = 30;
    
    // Boost score for high-end cards
    if (gpu.name.toLowerCase().includes('rtx 4090')) gpuScore = 100;
    else if (gpu.name.toLowerCase().includes('rtx 4080')) gpuScore = 95;
    else if (gpu.name.toLowerCase().includes('rtx 4070')) gpuScore = 85;
    else if (gpu.name.toLowerCase().includes('rtx 3080')) gpuScore = 80;
    else if (gpu.name.toLowerCase().includes('rtx 3070')) gpuScore = 75;
    
    gaming += gpuScore * 0.7;
    workstation += gpuScore * 0.4;
    general += gpuScore * 0.3;
  }
  
  // Memory Performance Analysis
  if (config.memory) {
    const memory = config.memory;
    let memoryScore = 0;
    
    // Extract memory size from name (rough estimation)
    if (memory.name.toLowerCase().includes('32gb') || memory.name.toLowerCase().includes('32 gb')) {
      memoryScore = 90;
    } else if (memory.name.toLowerCase().includes('16gb') || memory.name.toLowerCase().includes('16 gb')) {
      memoryScore = 75;
    } else if (memory.name.toLowerCase().includes('8gb') || memory.name.toLowerCase().includes('8 gb')) {
      memoryScore = 60;
    } else {
      memoryScore = 40;
    }
    
    gaming += memoryScore * 0.2;
    workstation += memoryScore * 0.3;
    general += memoryScore * 0.3;
  }
  
  return {
    gaming: Math.min(Math.round(gaming), 100),
    workstation: Math.min(Math.round(workstation), 100),
    general: Math.min(Math.round(general), 100)
  };
}

function analyzeCompatibility(config: BuildConfiguration): CompatibilityResult {
  const issues: string[] = [];
  let status: 'compatible' | 'incompatible' | 'warning' = 'compatible';
  
  // Power supply wattage check
  if (config.powerSupply && (config.cpu || config.videoCard)) {
    const estimatedPower = estimatePowerConsumption(config);
    const psuWattage = config.powerSupply.wattage;
    
      if (psuWattage < estimatedPower * 1.2) {
        issues.push(`The ${psuWattage}W PSU may be insufficient for the system (recommended: ${Math.ceil(estimatedPower * 1.2)}W)`);
      status = 'warning';
    }
  }
  
  // Memory and Motherboard compatibility
  if (config.memory && config.motherboard) {
    const memoryType = config.memory.name.toLowerCase();
    const motherboardName = config.motherboard.name.toLowerCase();
    
      if (memoryType.includes('ddr5') && !motherboardName.includes('ddr5')) {
        issues.push('DDR5 RAM may not be compatible with this motherboard');
      if (status === 'compatible') status = 'warning';
    }
  }
  
  return { status, issues };
}

function analyzePowerConsumption(config: BuildConfiguration): PowerConsumption {
  const estimated = estimatePowerConsumption(config);
  const recommended = Math.ceil(estimated * 1.3);
  
    let recommendation = `Recommended PSU: ${recommended}W or higher`;
  
  if (config.powerSupply) {
    const psuWattage = config.powerSupply.wattage;
    if (psuWattage >= recommended) {
      recommendation += ` (Current PSU ${psuWattage}W - Good)`;
    } else if (psuWattage >= estimated * 1.1) {
      recommendation += ` (Current PSU ${psuWattage}W - Acceptable)`;
    } else {
      recommendation += ` (Current PSU ${psuWattage}W - Insufficient)`;
    }
  }
  
  return { estimated, recommendation };
}

function estimatePowerConsumption(config: BuildConfiguration): number {
  let totalPower = 100; // Base system power
  
  // CPU power estimation
  if (config.cpu) {
    totalPower += config.cpu.tdp || 65;
  }
  
  // GPU power estimation
  if (config.videoCard) {
    const gpu = config.videoCard;
    let gpuPower = 150; // Default estimation
    
    if (gpu.name.toLowerCase().includes('rtx 4090')) gpuPower = 450;
    else if (gpu.name.toLowerCase().includes('rtx 4080')) gpuPower = 320;
    else if (gpu.name.toLowerCase().includes('rtx 4070')) gpuPower = 200;
    else if (gpu.name.toLowerCase().includes('rtx 3080')) gpuPower = 320;
    else if (gpu.name.toLowerCase().includes('rtx 3070')) gpuPower = 220;
    else if (gpu.name.toLowerCase().includes('rtx 3060')) gpuPower = 170;
    else if (gpu.name.toLowerCase().includes('gtx')) gpuPower = 150;
    
    totalPower += gpuPower;
  }
  
  // Additional components
  if (config.memory) totalPower += 10;
  if (config.internalHardDrive) totalPower += 10;
  if (config.monitor) totalPower += 30;
  
  return totalPower;
}

function analyzePriceEfficiency(config: BuildConfiguration): number {
  let totalPrice = 0;
  let performanceValue = 0;
  
  Object.values(config).forEach(component => {
    if (component) {
      totalPrice += component.price;
    }
  });
  
  // Calculate performance value based on key components
  if (config.cpu) {
    performanceValue += (config.cpu.core_count * config.cpu.core_clock) / config.cpu.price * 1000;
  }
  
  if (config.videoCard) {
    performanceValue += (config.videoCard.memory * config.videoCard.core_clock) / config.videoCard.price * 100;
  }
  
  // Normalize to 0-100 scale
  const efficiency = Math.min(performanceValue / 100, 100);
  return Math.round(efficiency);
}

function generateRecommendations(
  config: BuildConfiguration, 
  performance: PerformanceScore, 
  compatibility: CompatibilityResult,
  powerConsumption: PowerConsumption
): string[] {
  const recommendations: string[] = [];
  
  // Performance recommendations
  if (performance.gaming < 60 && config.videoCard) {
     recommendations.push('Upgrade the graphics card to improve gaming performance');
  }
  
  if (performance.workstation < 60 && config.cpu) {
     recommendations.push('Consider a CPU with more cores for workstation tasks');
  }
  
  if (!config.memory || config.memory.name.toLowerCase().includes('8gb')) {
     recommendations.push('Upgrade RAM to 16GB or 32GB to ensure performance');
  }
  
  // Compatibility recommendations
  if (compatibility.status === 'incompatible') {
     recommendations.push('Re-check compatibility between components');
  }
  
  // Power recommendations
  if (config.powerSupply && estimatePowerConsumption(config) * 1.2 > config.powerSupply.wattage) {
     recommendations.push('Upgrade the power supply to ensure system stability');
  }
  
  // Storage recommendations
  if (!config.internalHardDrive) {
     recommendations.push('Add an SSD to improve system speed');
  }
  
  // Balance recommendations
  if (config.cpu && config.videoCard) {
    const cpuValue = config.cpu.price;
    const gpuValue = config.videoCard.price;
    
    if (gpuValue > cpuValue * 2) {
      recommendations.push('The CPU may bottleneck the GPU; consider upgrading the CPU');
    } else if (cpuValue > gpuValue * 2) {
      recommendations.push('The GPU may not fully utilize the CPU capability');
    }
  }
  
  return recommendations;
}

function calculateOverallScore(
  performance: PerformanceScore, 
  compatibility: CompatibilityResult, 
  priceEfficiency: number
): number {
  let score = 0;
  
  // Performance contribution (50%)
  const avgPerformance = (performance.gaming + performance.workstation + performance.general) / 3;
  score += avgPerformance * 0.5;
  
  // Compatibility contribution (30%)
  if (compatibility.status === 'compatible') {
    score += 30;
  } else if (compatibility.status === 'warning') {
    score += 20;
  } else {
    score += 10;
  }
  
  // Price efficiency contribution (20%)
  score += priceEfficiency * 0.2;
  
  return Math.round(Math.min(score, 100));
}
