import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  currentAvatar: string;
  onPhotoUpdate: (photoUrl: string | null) => void;
  memberId: string;
  memberName: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhotoUrl,
  currentAvatar,
  onPhotoUpdate,
  memberId,
  memberName
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true);
      
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${memberId}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      // Update family member with photo URL
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ photo_url: publicUrl })
        .eq('id', memberId);

      if (updateError) throw updateError;

      onPhotoUpdate(publicUrl);
      toast.success('Photo uploaded successfully!', {
        icon: '📸',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo', {
        icon: '❌',
        duration: 3000,
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      // Update family member to remove photo URL
      const { error } = await supabase
        .from('family_members')
        .update({ photo_url: null })
        .eq('id', memberId);

      if (error) throw error;

      onPhotoUpdate(null);
      toast.success('Photo removed', {
        icon: '🗑️',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast.error('Failed to remove photo', {
        icon: '❌',
        duration: 3000,
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file', {
        icon: '⚠️',
        duration: 3000,
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB', {
        icon: '⚠️',
        duration: 3000,
      });
      return;
    }

    uploadPhoto(file);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Current Photo/Avatar Display */}
      <div className="relative">
        {currentPhotoUrl ? (
          <img
            src={currentPhotoUrl}
            alt={memberName}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center text-3xl">
            {currentAvatar}
          </div>
        )}
        
        {currentPhotoUrl && (
          <button
            onClick={removePhoto}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            title="Remove photo"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Camera size={16} />
          )}
          {uploading ? 'Uploading...' : 'Upload Photo'}
        </motion.button>
        
        <p className="text-xs text-gray-500">
          Max 5MB • JPG, PNG, GIF
        </p>
      </div>
    </div>
  );
};