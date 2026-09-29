import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MusicTrack, Playlist, Mashup, ApiResponse, PartnerNumber } from '@/types';

function uuid() {
  return 'track-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export const musicApi = {
  // Upload audio file and create track record
  uploadTrack: async (
    file: File,
    coupleId: string,
    uploadedBy: PartnerNumber,
    metadata: { title: string; artist: string; album?: string; mood?: string; coverFile?: File }
  ): Promise<ApiResponse<MusicTrack>> => {
    let audioUrl = '';
    let coverUrl = '';

    // Convert audio file to Base64/DataURL for immediate reliable playback
    const audioDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    audioUrl = audioDataUrl;

    if (metadata.coverFile) {
      coverUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(metadata.coverFile!);
      });
    }

    // Measure audio duration
    const duration = await new Promise<number>((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration) || 180);
      };
      audio.onerror = () => resolve(180);
      audio.src = audioDataUrl;
    });

    // If Supabase is configured and storage bucket exists, attempt storage upload
    if (isSupabaseConfigured() && supabase) {
      try {
        const filePath = `${coupleId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('couple-music')
          .upload(filePath, file, { contentType: file.type, upsert: true });

        if (!uploadErr && uploadData) {
          const { data: pubData } = supabase.storage.from('couple-music').getPublicUrl(filePath);
          if (pubData?.publicUrl) audioUrl = pubData.publicUrl;
        }

        // Try inserting into music_tracks table
        const { data: dbData } = await supabase
          .from('music_tracks')
          .insert({
            id: uuid(),
            couple_id: coupleId,
            uploaded_by: uploadedBy,
            title: metadata.title,
            artist: metadata.artist,
            album: metadata.album || '',
            storage_path: audioUrl,
            cover_path: coverUrl || '',
            duration,
            is_our_song: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (dbData) {
          return {
            success: true,
            data: {
              id: dbData.id,
              coupleId: dbData.couple_id,
              uploadedBy: dbData.uploaded_by,
              title: dbData.title,
              artist: dbData.artist,
              album: dbData.album,
              storagePath: dbData.storage_path,
              coverPath: dbData.cover_path,
              duration: dbData.duration,
              isOurSong: dbData.is_our_song || false,
              isFavorite: false,
              mood: metadata.mood as any,
              createdAt: dbData.created_at,
            },
          };
        }
      } catch (err) {
        console.warn('Supabase music upload fallback to local:', err);
      }
    }

    const track: MusicTrack = {
      id: uuid(),
      coupleId,
      uploadedBy,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      storagePath: audioUrl,
      coverPath: coverUrl || undefined,
      duration,
      isOurSong: false,
      isFavorite: false,
      mood: metadata.mood as any,
      createdAt: new Date().toISOString(),
    };

    return { success: true, data: track };
  },

  getAllTracks: async (coupleId: string): Promise<ApiResponse<MusicTrack[]>> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('music_tracks')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return {
            success: true,
            data: data.map((d: any) => ({
              id: d.id,
              coupleId: d.couple_id,
              uploadedBy: d.uploaded_by,
              title: d.title,
              artist: d.artist,
              album: d.album,
              storagePath: d.storage_path,
              coverPath: d.cover_path,
              duration: d.duration,
              isOurSong: d.is_our_song || false,
              isFavorite: false,
              createdAt: d.created_at,
            })),
          };
        }
      } catch {}
    }
    return { success: true, data: [] };
  },

  setOurSong: async (coupleId: string, trackId: string): Promise<ApiResponse<boolean>> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('music_tracks').update({ is_our_song: false }).eq('couple_id', coupleId);
        await supabase.from('music_tracks').update({ is_our_song: true }).eq('id', trackId);
      } catch {}
    }
    return { success: true, data: true };
  },
};
