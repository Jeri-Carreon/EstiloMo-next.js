import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get('mine');

    // PUBLIC REVIEWS
    if (!mine) {
      const reviews = await prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({ reviews });
    }

    // MY REVIEWS (AUTH REQUIRED)
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = await prisma.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ reviews });

  } catch (error) {
    console.log('GET REVIEWS ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to load reviews' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { service, rating, comment } = body;

    const review = await prisma.review.create({
      data: {
        service,
        rating: Number(rating),
        comment,
        userId: user.id,
      },
    });

    return NextResponse.json({ review }, { status: 201 });

  } catch (error) {
    console.log('CREATE REVIEW ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}