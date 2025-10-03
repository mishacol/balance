import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabaseService } from '../../services/supabaseService';
import { UserIcon, MailIcon, ShieldIcon, CalendarIcon, EditIcon, KeyIcon, TrashIcon, AlertTriangleIcon, CheckCircleIcon } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  
  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Email change states
  const [newEmail, setNewEmail] = useState('');
  
  // Account deletion states
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Success messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const { data: profileData } = await supabaseService.getUserProfile(user.id);
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
      // Update username
      await supabaseService.updateUserProfile(user.id, {
        username
      });
      
      // Update email if changed
      if (newEmail && newEmail !== user.email) {
        const { error } = await supabaseService.updateEmail(newEmail);
        if (error) {
          setSuccessMessage('Username updated, but email update failed. Please try again.');
          return;
        }
        setSuccessMessage('Username updated! Check your new email to verify the address change.');
      } else {
        setSuccessMessage('Username updated successfully!');
      }
      
      setProfile({ ...profile, username });
      setIsEditing(false);
      setNewEmail('');
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setSuccessMessage(null);
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    try {
      const { error } = await supabaseService.changePassword(newPassword);
      
      if (error) {
        setPasswordError(error.message || 'Failed to change password');
        return;
      }
      
      setSuccessMessage('Password changed successfully!');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError('Failed to change password');
    }
  };


  const handleAccountDeletion = async () => {
    setDeleteError(null);
    setSuccessMessage(null);
    
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion');
      return;
    }
    
    try {
      const { error } = await supabaseService.deleteAccount(deletePassword);
      
      if (error) {
        setDeleteError(error.message || 'Failed to delete account');
        return;
      }
      
      setSuccessMessage('Account deletion request submitted');
      setIsDeletingAccount(false);
      setDeletePassword('');
    } catch (error) {
      setDeleteError('Failed to delete account');
    }
  };

  const resetErrorMessages = () => {
    setPasswordError(null);
    setDeleteError(null);
    setSuccessMessage(null);
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
        <h1 className="text-3xl font-bold text-white mb-2">Profile & Security</h1>
        <p className="text-gray-400">Manage your account settings, passwords, and security</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-900/20 border border-green-500/50 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircleIcon size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <UserIcon size={20} className="mr-2 text-highlight" />
              Profile Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  resetErrorMessages();
                }}
                className="text-highlight hover:text-highlight/80 transition-colors"
                title="Edit profile"
              >
                <EditIcon size={16} />
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  
                  className="bg-background border border-border rounded-md px-3 py-2 text-white w-full focus:ring-2 focus:ring-highlight focus:border-transparent"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail || user?.email || ''}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-background border border-border rounded-md px-3 py-2 text-white w-full focus:ring-2 focus:ring-highlight focus:border-transparent"
                  placeholder="Enter new email"
                />
                <p className="text-xs text-gray-500 mt-1">Changing your email requires verification of the new address.</p>
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
                    resetErrorMessages();
                  }}
                  className="bg-border text-white px-4 py-2 rounded-md font-medium hover:bg-border/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserIcon size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Username</p>
                  <p className="text-white font-medium">{profile?.username || 'Not set'}</p>
                </div>
              </div>
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
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <KeyIcon size={20} className="mr-2 text-highlight" />
          Change Password
          </h2>
          
          {!isChangingPassword ? (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">Keep your account secure by updating your password regularly.</p>
              <button
                onClick={() => {
                  setIsChangingPassword(true);
                  resetErrorMessages();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background border border-border rounded-md px-3 py-2 text-white w-full focus:ring-2 focus:ring-highlight focus:border-transparent"
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background border border-border rounded-md px-3 py-2 text-white w-full focus:ring-2 focus:ring-highlight focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>
              
              {passwordError && (
                <div className="text-red-400 text-sm flex items-center space-x-1">
                  <AlertTriangleIcon size={14} />
                  <span>{passwordError}</span>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-highlight text-background px-4 py-2 rounded-md font-medium hover:bg-highlight/90 transition-colors"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    resetErrorMessages();
                  }}
                  className="bg-border text-white px-4 py-2 rounded-md font-medium hover:bg-border/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>


        {/* Account Deletion */}
        <div className="bg-surface border border-red-500/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <TrashIcon size={20} className="mr-2 text-red-400" />
            Delete Account
          </h2>
          
          {!isDeletingAccount ? (
            <div className="space-y-3">
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangleIcon size={16} className="text-red-400" />
                  <span className="text-sm font-medium text-red-400">Danger Zone</span>
                </div>
                <p className="text-gray-400 text-sm">Permanently delete your account and all data. This action cannot be undone.</p>
              </div>
              
              <button
                onClick={() => {
                  setIsDeletingAccount(true);
                  resetErrorMessages();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Delete Account
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleAccountDeletion(); }} className="space-y-4">
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangleIcon size={16} className="text-red-400" />
                  <span className="text-sm font-medium text-red-400">Are you sure?</span>
                </div>
                <p className="text-gray-400 text-sm">This will permanently delete your account and all associated data.</p>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-1">Enter your password to confirm</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="bg-background border border-border rounded-md px-3 py-2 text-white w-full focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
              
              {deleteError && (
                <div className="text-red-400 text-sm flex items-center space-x-1">
                                  <AlertTriangleIcon size={14} />
                  <span>{deleteError}</span>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Confirm Deletion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeletingAccount(false);
                    setDeletePassword('');
                    resetErrorMessages();
                  }}
                  className="bg-border text-white px-4 py-2 rounded-md font-medium hover:bg-border/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};