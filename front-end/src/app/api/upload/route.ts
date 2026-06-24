import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string | null) || 'after-service-photos';

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${bucket === 'payment-screenshots' ? 'payment-' : 'after-service-'}${Date.now()}.${fileExt}`;
    const supabaseClient = supabase

    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('SUPABASE UPLOAD ERROR:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: data.publicUrl,
    });
  } catch (error) {
    console.error('UPLOAD ROUTE ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
