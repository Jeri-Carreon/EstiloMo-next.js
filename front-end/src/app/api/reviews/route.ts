import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// =========================
// GET REVIEWS
// =========================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get('mine');

    // =========================
    // PUBLIC REVIEWS
    // =========================
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

    // =========================
    // MY REVIEWS (AUTH REQUIRED)
    // =========================
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = await prisma.review.findMany({
      where: {
        userId: user.id,
      },
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
    console.error('GET REVIEWS ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to load reviews' },
      { status: 500 }
    );
  }
}

// =========================
// CREATE REVIEW
// =========================
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { service, rating, comment } = await req.json();

    const review = await prisma.review.create({
      data: {
        service,
        rating: Number(rating),
        comment,
        userId: user.id, // ✅ correct relation
      },
    });

    return NextResponse.json({ review }, { status: 201 });

  } catch (error) {
    console.error('CREATE REVIEW ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}