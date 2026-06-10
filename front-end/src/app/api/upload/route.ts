import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `after-service-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('after-service-photos')
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
      .from('after-service-photos')
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