import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, RefreshCw, Database, Eye, Edit, Trash, TrendingUp, Clock } from 'lucide-react';
import { useFirestoreUsage } from '../hooks/useFirestoreUsage';
import { format, subHours } from 'date-fns';

interface UsageDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
}

const UsageDropdown: React.FC<UsageDropdownProps> = ({ isOpen, onToggle }) => {
  const { usage, loading, resetUsage } = useFirestoreUsage();
  const [viewMode, setViewMode] = useState<'summary' | 'hourly'>('summary');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  if (!isOpen) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const totalOperations = usage.totalReads + usage.totalWrites + usage.totalDeletes;

  // Get peak hour data
  const peakHour = usage.hourlyData.reduce((peak, current) => {
    const currentTotal = current.reads + current.writes + current.deletes;
    const peakTotal = peak.reads + peak.writes + peak.deletes;
    return currentTotal > peakTotal ? current : peak;
  }, usage.hourlyData[0] || { hour: '', reads: 0, writes: 0, deletes: 0, timestamp: new Date() });

  // Get recent hours (last 6 hours)
  const recentHours = usage.hourlyData.slice(-6);

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all usage analytics? This will clear all historical data.')) {
      await resetUsage();
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50 animate-fade-in max-h-[80vh] overflow-y-auto"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Firestore Analytics</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'summary' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('hourly')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'hourly' 
                    ? 'bg-violet-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Hourly
              </button>
            </div>
            <button
              onClick={handleReset}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700/50"
              title="Reset all analytics"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'summary' ? (
              <>
                {/* 24-Hour Summary */}
                <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-lg p-3 border border-violet-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium text-violet-300">Last 24 Hours</span>
                    </div>
                    <span className="text-lg font-bold text-white">{formatNumber(totalOperations)}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Total database operations
                  </div>
                </div>

                {/* Individual Stats */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Reads */}
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium text-green-300">Document Reads</span>
                    </div>
                    <span className="text-lg font-bold text-green-400">{formatNumber(usage.totalReads)}</span>
                  </div>

                  {/* Writes */}
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">Document Writes</span>
                    </div>
                    <span className="text-lg font-bold text-blue-400">{formatNumber(usage.totalWrites)}</span>
                  </div>

                  {/* Deletes */}
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <Trash className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-red-300">Document Deletes</span>
                    </div>
                    <span className="text-lg font-bold text-red-400">{formatNumber(usage.totalDeletes)}</span>
                  </div>
                </div>

                {/* Peak Hour */}
                {peakHour && (peakHour.reads + peakHour.writes + peakHour.deletes) > 0 && (
                  <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-300">Peak Hour</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        {format(peakHour.timestamp, 'MMM d, h:mm a')}
                      </span>
                      <span className="text-lg font-bold text-yellow-400">
                        {formatNumber(peakHour.reads + peakHour.writes + peakHour.deletes)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Usage Breakdown */}
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Usage Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Reads</span>
                      <span className="text-green-400">{totalOperations > 0 ? ((usage.totalReads / totalOperations) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${totalOperations > 0 ? (usage.totalReads / totalOperations) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Writes</span>
                      <span className="text-blue-400">{totalOperations > 0 ? ((usage.totalWrites / totalOperations) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${totalOperations > 0 ? (usage.totalWrites / totalOperations) * 100 : 0}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Deletes</span>
                      <span className="text-red-400">{totalOperations > 0 ? ((usage.totalDeletes / totalOperations) * 100).toFixed(1) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-red-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${totalOperations > 0 ? (usage.totalDeletes / totalOperations) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Hourly View */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Recent Activity (Last 6 Hours)
                  </h4>
                  
                  {recentHours.map((hour, index) => {
                    const hourTotal = hour.reads + hour.writes + hour.deletes;
                    const maxTotal = Math.max(...recentHours.map(h => h.reads + h.writes + h.deletes));
                    const percentage = maxTotal > 0 ? (hourTotal / maxTotal) * 100 : 0;
                    
                    return (
                      <div key={hour.hour} className="bg-gray-700/30 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-300">
                            {format(hour.timestamp, 'h:mm a')}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {formatNumber(hourTotal)}
                          </span>
                        </div>
                        
                        {/* Mini bar chart */}
                        <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                          <div 
                            className="bg-gradient-to-r from-violet-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        
                        {/* Breakdown */}
                        <div className="flex justify-between text-xs text-gray-400">
                          <span className="text-green-400">R: {hour.reads}</span>
                          <span className="text-blue-400">W: {hour.writes}</span>
                          <span className="text-red-400">D: {hour.deletes}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* All Hours Summary */}
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">24-Hour Overview</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {usage.hourlyData.map((hour, index) => {
                      const hourTotal = hour.reads + hour.writes + hour.deletes;
                      const maxInDay = Math.max(...usage.hourlyData.map(h => h.reads + h.writes + h.deletes));
                      const height = maxInDay > 0 ? Math.max((hourTotal / maxInDay) * 40, 2) : 2;
                      
                      return (
                        <div
                          key={hour.hour}
                          className="flex flex-col items-center"
                          title={`${format(hour.timestamp, 'h:mm a')}: ${hourTotal} operations`}
                        >
                          <div
                            className="w-3 bg-gradient-to-t from-violet-500 to-blue-500 rounded-sm mb-1 transition-all duration-300 hover:opacity-80"
                            style={{ height: `${height}px` }}
                          ></div>
                          {index % 4 === 0 && (
                            <span className="text-xs text-gray-500 transform -rotate-45 origin-center">
                              {format(hour.timestamp, 'HH')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Last Updated */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700/50">
              Last updated: {format(usage.lastUpdated, 'MMM d, h:mm:ss a')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsageDropdown;