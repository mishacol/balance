import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabaseService } from '../../services/supabaseService';
import { UserIcon, MailIcon, ShieldIcon, CalendarIcon, EditIcon } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const profileData = await supabaseService.getUserProfile(user.id);
          setProfile(profileData);
          if (profileData) {
            setUsername(profileData.username || '');
          }
        } catch (error) {
          console.error('Failed to load profile:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await supabaseService.updateUserProfile(user.id, {
        username
      });
      
      setProfile({ ...profile, username });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-highlight mx-auto mb-4"></div>
        <p className="text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-gray-400">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-2">
          <div className="bg-surface border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <UserIcon size={20} className="mr-2 text-highlight" />
                Account Information
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-highlight hover:text-highlight/80 transition-colors"
                >
                  <EditIcon size={16} />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div className="flex items-center space-x-3">
                    <UserIcon size={20} className="text-gray-400" />
                    <div className="flex-1">
                      <label className="text-sm text-gray-400 block mb-1">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-background border border-border rounded-md px-3 py-2 text-white w-full"
                        placeholder="Enter username"
                      />
                    </div>
                  </div>
                  
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleSave}
                      className="bg-highlight text-background px-4 py-2 rounded-md font-medium hover:bg-highlight/90 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setUsername(profile?.username || '');
                      }}
                      className="bg-border text-white px-4 py-2 rounded-md font-medium hover:bg-border/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <UserIcon size={20} className="text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Username</p>
                      <p className="text-white font-medium">{profile?.username || 'Not set'}</p>
                    </div>
                  </div>
                  
                </>
              )}
              
              <div className="flex items-center space-x-3">
                <MailIcon size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <CalendarIcon size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Member since</p>
                  <p className="text-white font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ShieldIcon size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Email verified</p>
                  <p className={`font-medium ${user?.email_confirmed_at ? 'text-green-400' : 'text-orange-400'}`}>
                    {user?.email_confirmed_at ? 'Yes' : 'Pending verification'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Storage Info */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <ShieldIcon size={20} className="mr-2 text-highlight" />
              Data Storage
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Storage Provider</span>
                <span className="text-green-400 font-medium">Supabase</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Data Security</span>
                <span className="text-green-400 font-medium">End-to-end encrypted</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Backup Status</span>
                <span className="text-green-400 font-medium">Automatic</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">User ID</span>
                <span className="text-xs text-gray-500 font-mono">{user?.id.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Session Active</span>
                <span className="text-green-400">✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Profile Setup</span>
                <span className="text-green-400">Complete</span>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-400 mb-4">
                For account management options like password changes, email updates, and account deletion, please visit your Supabase dashboard.
              </div>
              
              <a
                href="https://app.supabase.com/project/fcpmdjmssfcrutbypbcx"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-highlight text-background text-center py-2 px-4 rounded-md font-medium hover:bg-highlight/90 transition-colors transition-all"
              >
                Supabase Dashboard →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
