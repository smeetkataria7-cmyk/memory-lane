import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { todayKey } from './dates';
import { removeAllUserFiles } from './storageCleanup';
import { supabase } from './supabase';

/** Everything held about the signed-in user, as pretty-printed JSON. */
export async function exportMyData(): Promise<string> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw error;
  return JSON.stringify(data, null, 2);
}

/** Write the export to a file and open the share sheet so it can be saved or sent. */
export async function shareMyData(): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  const json = await exportMyData();
  // The cache folder is private to the app and the system clears it when it
  // needs space. The file holds private notes, so it is never put anywhere shared.
  const file = new File(Paths.cache, `memory-lane-export-${todayKey()}.json`);
  file.create({ overwrite: true });
  file.write(json);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your Memory Lane data',
  });
}

/**
 * Permanently delete the account. The files go first because Storage only lets
 * a signed-in user remove their own files, and the account is gone afterwards.
 * Then the database function removes the user and everything that hangs off them.
 */
export async function deleteMyAccount(userId: string): Promise<void> {
  await removeAllUserFiles(supabase.storage, userId);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
