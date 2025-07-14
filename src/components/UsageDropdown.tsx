import React, { useState, useRef, useEffect } from 'react';
import { BarChart3, RefreshCw, Database, Eye, Edit, Trash } from 'lucide-react';
import { useFirestoreUsage } from '../hooks/useFirestoreUsage';
import { format } from 'date-fns';

interface UsageDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
}

const UsageDropdown: React.FC<UsageDropdownProps> = ({ isOpen, onToggle }) => {
  const { usage, loading, resetUsage, syncWithFirebaseUsage } = useFirestoreUsage();
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

  const totalOperations = usage.reads + usage.writes + usage.deletes;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-80 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700/50 z-50 animate-fade-in"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">Firebase Usage</h3>
          </div>
          <div className="flex gap-1">
            <button
              onClick={syncWithFirebaseUsage}
              className="p-1.5 text-gray-400 hover:text-violet-400 transition-colors rounded-md hover:bg-gray-700/50"
              title="Sync with Firebase console"
            >
              <Database size={16} />
            </button>
            <button
              onClick={resetUsage}
              className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-md hover:bg-gray-700/50"
              title="Reset to current values"
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
            {/* Total Operations */}
            <div className="bg-gray-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">Total Operations</span>
                </div>
                <span className="text-lg font-bold text-white">{formatNumber(totalOperations)}</span>
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
                <span className="text-lg font-bold text-green-400">{formatNumber(usage.reads)}</span>
              </div>

              {/* Writes */}
              <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Document Writes</span>
                </div>
                <span className="text-lg font-bold text-blue-400">{formatNumber(usage.writes)}</span>
              </div>

              {/* Deletes */}
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2">
                  <Trash className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-300">Document Deletes</span>
                </div>
                <span className="text-lg font-bold text-red-400">{formatNumber(usage.deletes)}</span>
              </div>
            </div>

            {/* Usage Breakdown */}
            <div className="bg-gray-700/30 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Operation Distribution</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Reads</span>
                  <span className="text-green-400">{totalOperations > 0 ? ((usage.reads / totalOperations) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Writes</span>
                  <span className="text-blue-400">{totalOperations > 0 ? ((usage.writes / totalOperations) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Deletes</span>
                  <span className="text-red-400">{totalOperations > 0 ? ((usage.deletes / totalOperations) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>

            {/* Firebase Console Note */}
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Firebase Console Sync</span>
              </div>
              <p className="text-xs text-blue-200/80">
                Reads: 0 | Writes: 00 | Deletes: 0 (Last 24h from Firebase Console)
              </p>
            </div>
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