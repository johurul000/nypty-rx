// app/(app)/settings/page.tsx
'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { UserSettings, SettingsFormData } from '@/types'; // Import types
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, User, Store, Bell, Palette, LogOut, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle'; // Import the theme toggle component

// --- Default Settings State ---
const defaultSettings: SettingsFormData = {
    preferences: {
        theme: 'system', // Note: Theme is handled by next-themes, not saved in DB here
        notificationsEnabled: true,
        itemsPerPage: 20,
    },
    sync_enabled: true,
};

export default function SettingsPage() {
    const supabase = createClient();
    const { user, signOut } = useAuth(); // Get user and signOut function

    // --- State ---
    const [settings, setSettings] = useState<SettingsFormData>(defaultSettings);
    const [originalSettingsId, setOriginalSettingsId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Fetch User Settings ---
    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) { setIsLoading(false); return; }

            setIsLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('user_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (fetchError && fetchError.code !== 'PGRST116') { throw fetchError; }

                if (data) {
                    // Map fetched data to form state, using defaults for missing fields
                    // NOTE: We DON'T load/save the 'theme' preference from the DB here.
                    // next-themes handles theme persistence in localStorage.
                    // We only save other preferences.
                    setSettings({
                        id: data.id,
                        preferences: {
                            theme: 'system', // Keep local theme state separate or ignore
                            notificationsEnabled: data.preferences?.notificationsEnabled ?? defaultSettings.preferences.notificationsEnabled,
                            itemsPerPage: data.preferences?.itemsPerPage ?? defaultSettings.preferences.itemsPerPage,
                        },
                        sync_enabled: data.sync_enabled ?? defaultSettings.sync_enabled,
                    });
                    setOriginalSettingsId(data.id);
                } else {
                    // No settings found, use defaults (excluding theme from DB state)
                    setSettings({
                        ...defaultSettings,
                        preferences: { ...defaultSettings.preferences, theme: 'system' } // Keep theme separate
                    });
                    setOriginalSettingsId(null);
                }
            } catch (err: any) {
                console.error("Error fetching settings:", err);
                setError("Could not load user settings.");
                toast.error("Loading Error", { description: "Could not load settings." });
                setSettings(defaultSettings);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [user, supabase]);


    // --- Handle Setting Changes ---
    const handlePreferenceChange = (field: keyof Omit<SettingsFormData['preferences'], 'theme'>, value: any) => {
        // Exclude 'theme' from being managed here
         setSettings(prev => ({
             ...prev,
             preferences: {
                 ...prev.preferences,
                 [field]: value,
             },
         }));
    };

    const handleSwitchChange = (field: keyof Pick<SettingsFormData, 'sync_enabled'>, checked: boolean) => {
         setSettings(prev => ({
             ...prev,
             [field]: checked,
         }));
    };


    // --- Handle Save Changes ---
    const handleSaveChanges = async () => {
        if (!user) { toast.error("Not Authenticated"); return; }

        setIsSaving(true);
        setError(null);

        try {
            // Prepare data, EXCLUDING the theme preference
            const preferencesToSave = { ...settings.preferences };
            delete (preferencesToSave as any).theme; // Ensure theme is not saved to DB

            const dataToSave: Partial<UserSettings> = {
                id: originalSettingsId ?? undefined,
                user_id: user.id,
                preferences: preferencesToSave, // Save the preferences object without theme
                sync_enabled: settings.sync_enabled,
            };

            if (!dataToSave.id) { delete dataToSave.id; }

            console.log("Saving settings (excluding theme):", dataToSave);

            const { data, error: saveError } = await supabase
                .from('user_settings')
                .upsert(dataToSave, { onConflict: 'user_id' })
                .select()
                .single();

            if (saveError) throw saveError;

            if (data) {
                // Update state with potentially new ID or updated_at from DB
                // Remap DB response, ensuring theme is handled separately
                 setSettings({
                     id: data.id,
                     preferences: {
                         theme: 'system', // Keep local theme state separate
                         notificationsEnabled: data.preferences?.notificationsEnabled ?? defaultSettings.preferences.notificationsEnabled,
                         itemsPerPage: data.preferences?.itemsPerPage ?? defaultSettings.preferences.itemsPerPage,
                     },
                     sync_enabled: data.sync_enabled ?? defaultSettings.sync_enabled,
                 });
                setOriginalSettingsId(data.id);
                toast.success("Settings Saved", { description: "Your preferences (excluding theme) have been updated." });
            } else {
                 throw new Error("Save successful but no data returned.");
            }

        } catch (err: any) {
            console.error("Error saving settings:", err);
            setError(`Failed to save settings: ${err.message}`);
            toast.error("Save Failed", { description: `Failed to save settings: ${err.message}` });
        } finally {
            setIsSaving(false);
        }
    };


    // --- Render Logic ---

    if (isLoading) {
        return (
             <div className="flex items-center justify-center p-10">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <span className="ml-3 text-muted-foreground">Loading Settings...</span>
             </div>
         );
    }

     if (error && !isLoading) {
         return (
             <Card className="m-4 md:m-6 lg:m-8 border-destructive bg-destructive/10">
                  <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className='mr-2 h-5 w-5'/> Loading Error</CardTitle></CardHeader>
                  <CardContent><p>{error}</p></CardContent>
             </Card>
         );
     }

    return (
        <div className="space-y-8 p-1 md:p-4 lg:p-6 max-w-4xl mx-auto"> {/* Increased spacing */}
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            {/* Profile Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg"><User className="mr-2 h-5 w-5" /> Profile</CardTitle>
                    <CardDescription>Your account information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4"> {/* Increased spacing */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <Label className="font-semibold text-sm sm:w-1/4 mb-1 sm:mb-0">Email Address</Label>
                        <span className="text-sm text-muted-foreground truncate" title={user?.email ?? ''}>{user?.email ?? 'N/A'}</span>
                    </div>
                    <Separator />
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                         <Label className="font-semibold text-sm sm:w-1/4 mb-1 sm:mb-0">Password</Label>
                         <span className="text-sm text-muted-foreground">Password can be changed via password reset.</span>
                         {/* Add password reset functionality/button if needed */}
                     </div>
                </CardContent>
            </Card>

            {/* Store Settings Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg"><Store className="mr-2 h-5 w-5" /> Store Settings</CardTitle>
                    <CardDescription>Manage your store's details and location.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm mb-4">Update your store name, address, and precise map location on the dedicated Store Setup page.</p>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/store-setup">Go to Store Setup</Link>
                    </Button>
                </CardContent>
            </Card>

             {/* Preferences Section */}
            <Card>
                <CardHeader>
                     <CardTitle className="flex items-center text-lg"><Palette className="mr-2 h-5 w-5" /> Preferences</CardTitle>
                     <CardDescription>Customize your application appearance and behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6"> {/* Increased spacing */}
                    {/* Theme Selection */}
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className='space-y-0.5 mb-2 sm:mb-0'>
                             <Label className="text-base font-medium">Theme</Label>
                             <p className="text-xs text-muted-foreground">Select the application's light or dark mode preference.</p>
                        </div>
                         <ThemeToggle /> {/* Use the dedicated theme toggle component */}
                     </div>

                    <Separator/>

                    {/* Notifications Toggle */}
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className='space-y-0.5 mb-2 sm:mb-0'>
                             <Label htmlFor="notificationsEnabled" className="text-base font-medium">Enable Notifications</Label>
                             <p className="text-xs text-muted-foreground">Receive alerts for low stock or expiring items (feature pending).</p>
                        </div>
                         <Switch
                             id="notificationsEnabled"
                             checked={settings.preferences.notificationsEnabled}
                             onCheckedChange={(checked) => handlePreferenceChange('notificationsEnabled', checked)}
                             disabled={isSaving}
                             aria-label="Enable Notifications Toggle"
                         />
                     </div>

                    <Separator/>

                    {/* Items Per Page */}
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className='space-y-0.5 mb-2 sm:mb-0'>
                             <Label htmlFor="itemsPerPage" className="text-base font-medium">Items Per Page</Label>
                             <p className="text-xs text-muted-foreground">Default number of items shown in inventory/sales tables.</p>
                        </div>
                         <Input
                             id="itemsPerPage"
                             type="number"
                             min="5"
                             max="100"
                             step="5"
                             value={settings.preferences.itemsPerPage}
                             onChange={(e) => handlePreferenceChange('itemsPerPage', parseInt(e.target.value, 10) || 20)}
                             disabled={isSaving}
                             className="w-[90px]" // Adjust width
                             aria-label="Items Per Page Input"
                         />
                     </div>

                    {/* Example: Sync Enabled (Placeholder - if you add specific sync logic later) */}
                     {/*
                     <Separator/>
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className='space-y-0.5 mb-2 sm:mb-0'>
                             <Label htmlFor="sync_enabled" className="text-base font-medium">Enable Real-time Sync</Label>
                             <p className="text-xs text-muted-foreground">Keep data updated across devices instantly (requires backend setup).</p>
                        </div>
                         <Switch
                             id="sync_enabled"
                             checked={settings.sync_enabled}
                             onCheckedChange={(checked) => handleSwitchChange('sync_enabled', checked)}
                             disabled={isSaving}
                             aria-label="Enable Real-time Sync Toggle"
                         />
                     </div>
                     */}
                 </CardContent>
                 {/* Save Button within Preferences Card */}
                 <CardContent>
                     <Separator className="mb-4"/>
                     <Button onClick={handleSaveChanges} disabled={isSaving}>
                         {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Preferences...</> : <><Save className='mr-2 h-4 w-4'/> Save Preferences</>}
                     </Button>
                      {/* Display save error specific to preferences */}
                     {error && error.startsWith("Failed to save settings:") && (
                         <p className="text-sm text-destructive mt-2">{error}</p>
                     )}
                 </CardContent>
            </Card>

            {/* Account Actions Section */}
            <Card>
                <CardHeader>
                     <CardTitle className="flex items-center text-lg"><LogOut className="mr-2 h-5 w-5" /> Account Actions</CardTitle>
                     <CardDescription>Manage your current session.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button variant="destructive" onClick={signOut} size="sm">
                         Sign Out
                     </Button>
                     <p className="text-xs text-muted-foreground mt-2">This will log you out of the CRM on this device.</p>
                </CardContent>
            </Card>
        </div>
    );
}