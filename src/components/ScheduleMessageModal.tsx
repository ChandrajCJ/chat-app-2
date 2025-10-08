import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Send, Calendar, Repeat, Trash2 } from 'lucide-react';
import { RecurrenceType, DayOfWeek, ScheduledMessage } from '../types';
import { formatDistanceToNow, format } from 'date-fns';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleMessage: (text: string, date: Date, time: string, recurrence: RecurrenceType, selectedDays?: DayOfWeek[]) => Promise<void>;
  onDeleteScheduledMessage?: (messageId: string) => Promise<void>;
  onToggleScheduledMessage?: (messageId: string, enabled: boolean) => Promise<void>;
  scheduledMessages?: ScheduledMessage[];
}

const DAYS_OF_WEEK: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  isOpen,
  onClose,
  onScheduleMessage,
  onDeleteScheduledMessage,
  onToggleScheduledMessage,
  scheduledMessages = []
}) => {
  const [scheduleText, setScheduleText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleRecurrence, setScheduleRecurrence] = useState<RecurrenceType>('none');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setScheduleText('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleRecurrence('none');
      setSelectedDays([]);
      setActiveTab('create');
    }
  }, [isOpen]);

  const handleDayToggle = (day: DayOfWeek) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleScheduleMessage = async () => {
    if (!scheduleText.trim() || !scheduleDate || !scheduleTime) {
      alert('Please fill in all fields (message, date, and time)');
      return;
    }

    // Validate that the date/time is in the future
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    if (scheduledDateTime <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    // For custom recurrence, ensure at least one day is selected
    if (scheduleRecurrence === 'custom' && selectedDays.length === 0) {
      alert('Please select at least one day for custom recurrence');
      return;
    }

    setIsScheduling(true);
    try {
      await onScheduleMessage(
        scheduleText, 
        new Date(scheduleDate), 
        scheduleTime, 
        scheduleRecurrence,
        scheduleRecurrence === 'custom' ? selectedDays : undefined
      );
      // Reset form
      setScheduleText('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleRecurrence('none');
      setSelectedDays([]);
      alert('Message scheduled successfully!');
    } catch (error) {
      console.error('Error scheduling message:', error);
      alert('Failed to schedule message. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleDeleteScheduled = async (messageId: string) => {
    if (window.confirm('Are you sure you want to delete this scheduled message?')) {
      if (onDeleteScheduledMessage) {
        try {
          await onDeleteScheduledMessage(messageId);
        } catch (error) {
          console.error('Error deleting scheduled message:', error);
          alert('Failed to delete scheduled message. Please try again.');
        }
      }
    }
  };

  const handleToggleScheduled = async (messageId: string, currentEnabled: boolean) => {
    if (onToggleScheduledMessage) {
      try {
        await onToggleScheduledMessage(messageId, !currentEnabled);
      } catch (error) {
        console.error('Error toggling scheduled message:', error);
        alert('Failed to toggle scheduled message. Please try again.');
      }
    }
  };

  const getRecurrenceLabel = (recurrence: RecurrenceType, selectedDays?: DayOfWeek[]) => {
    if (recurrence === 'custom' && selectedDays && selectedDays.length > 0) {
      return `Custom (${selectedDays.map(d => d.substring(0, 3)).join(', ')})`;
    }
    return recurrence.charAt(0).toUpperCase() + recurrence.slice(1);
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Clock size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Schedule Messages
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Create Schedule
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'manage'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Manage ({scheduledMessages.filter(m => m.enabled).length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'create' ? (
            <div className="space-y-5">
              {/* Message Text Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  placeholder="Enter your message..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar size={16} className="inline mr-2" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Time Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Clock size={16} className="inline mr-2" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Recurrence Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Repeat size={16} className="inline mr-2" />
                  Recurrence
                </label>
                <select
                  value={scheduleRecurrence}
                  onChange={(e) => {
                    setScheduleRecurrence(e.target.value as RecurrenceType);
                    if (e.target.value !== 'custom') {
                      setSelectedDays([]);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="none">One time only</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom days</option>
                </select>
              </div>

              {/* Day Selection for Custom Recurrence */}
              {scheduleRecurrence === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Days
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`px-2 py-3 rounded-lg text-xs font-medium transition-all ${
                          selectedDays.includes(day)
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                  {selectedDays.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Selected: {selectedDays.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* Schedule Button */}
              <button
                onClick={handleScheduleMessage}
                disabled={isScheduling || !scheduleText.trim() || !scheduleDate || !scheduleTime || (scheduleRecurrence === 'custom' && selectedDays.length === 0)}
                className="w-full px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isScheduling ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Send size={16} />
                    Schedule Message
                  </>
                )}
              </button>
            </div>
          ) : (
            // Manage Tab
            <div className="space-y-3">
              {scheduledMessages.length === 0 ? (
                <div className="text-center py-12">
                  <Clock size={48} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No scheduled messages yet</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Create your first schedule
                  </button>
                </div>
              ) : (
                scheduledMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-4 border rounded-lg transition-all ${
                      msg.enabled
                        ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium line-clamp-2 mb-2">
                          {msg.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(msg.scheduledDate, 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {msg.scheduledTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Repeat size={12} />
                            {getRecurrenceLabel(msg.recurrence, msg.selectedDays)}
                          </span>
                        </div>
                        {!msg.sent && msg.enabled && (
                          <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            Next: {formatDistanceToNow(msg.scheduledDate, { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Toggle Button */}
                        <button
                          onClick={() => handleToggleScheduled(msg.id, msg.enabled)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            msg.enabled
                              ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 hover:bg-success-200 dark:hover:bg-success-900/50'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {msg.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteScheduled(msg.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default ScheduleMessageModal;

