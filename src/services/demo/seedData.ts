import { getRepository } from '@/services/memory';
import type { MovieEntry, FoodEntry, TravelEntry, NoteEntry, WishlistEntry, GoalEntry } from '@/types';

export async function seedDemoData(uid: string): Promise<void> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const yesterday = now - dayMs;

  const movieRepo = getRepository<MovieEntry>('movie');
  const foodRepo = getRepository<FoodEntry>('food');
  const travelRepo = getRepository<TravelEntry>('travel');
  const noteRepo = getRepository<NoteEntry>('note');
  const wishlistRepo = getRepository<WishlistEntry>('wishlist');
  const goalRepo = getRepository<GoalEntry>('goal');

  // Clear existing demo records first to avoid duplicates
  const existingMovies = await movieRepo.fetchAll(uid);
  const existingFood = await foodRepo.fetchAll(uid);
  const existingTravel = await travelRepo.fetchAll(uid);
  const existingNotes = await noteRepo.fetchAll(uid);
  const existingWishlist = await wishlistRepo.fetchAll(uid);
  const existingGoals = await goalRepo.fetchAll(uid);

  await Promise.all([
    ...existingMovies.map((m) => movieRepo.delete(uid, m.id)),
    ...existingFood.map((f) => foodRepo.delete(uid, f.id)),
    ...existingTravel.map((t) => travelRepo.delete(uid, t.id)),
    ...existingNotes.map((n) => noteRepo.delete(uid, n.id)),
    ...existingWishlist.map((w) => wishlistRepo.delete(uid, w.id)),
    ...existingGoals.map((g) => goalRepo.delete(uid, g.id)),
  ]);

  // Seed Movies
  await movieRepo.add(uid, {
    tmdbId: 693134,
    title: 'Dune: Part Two',
    year: 2024,
    director: 'Denis Villeneuve',
    genres: ['Science Fiction', 'Adventure'],
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    rating: 9.5,
    watchDate: yesterday,
    review: 'Visually stunning masterpiece. Epic scale, breathtaking sound design, and incredible pacing.',
    favorite: true,
    tags: ['dune', 'science fiction', 'denis villeneuve', 'timothee chalamet', 'zendaya'],
  });

  await movieRepo.add(uid, {
    tmdbId: 872585,
    title: 'Oppenheimer',
    year: 2023,
    director: 'Christopher Nolan',
    genres: ['Drama', 'History'],
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon'],
    rating: 9.0,
    watchDate: now - 14 * dayMs,
    review: 'Masterful editing and sound design. Cillian Murphy delivers a haunting performance.',
    tags: ['oppenheimer', 'drama', 'history', 'christopher nolan', 'cillian murphy'],
  });

  await movieRepo.add(uid, {
    tmdbId: 129,
    title: 'Spirited Away',
    year: 2001,
    director: 'Hayao Miyazaki',
    genres: ['Animation', 'Fantasy'],
    rating: 9.8,
    watchDate: now - 30 * dayMs,
    rewatch: true,
    review: 'Timeless masterpiece. The music and atmosphere are unmatched.',
    favorite: true,
    tags: ['spirited away', 'animation', 'fantasy', 'hayao miyazaki', 'ghibli'],
  });

  // Seed Food
  await foodRepo.add(uid, {
    restaurant: 'Tokyo Bowl',
    cuisine: 'Japanese',
    price: 42,
    rating: 9.2,
    favoriteDishes: ['Tonkotsu Ramen', 'Chashu Don', 'Gyoza'],
    companions: ['Sarah'],
    date: yesterday,
    notes: 'Incredible rich broth and authentic noodles. Had ramen with Sarah right after watching Dune Part Two.',
    favorite: true,
    tags: ['tokyo bowl', 'japanese', 'ramen', 'sarah', 'tonkotsu'],
  });

  await foodRepo.add(uid, {
    restaurant: 'Trattoria Bella',
    cuisine: 'Italian',
    price: 65,
    rating: 8.8,
    favoriteDishes: ['Truffle Pasta', 'Tiramisu'],
    companions: ['Sarah'],
    date: now - 10 * dayMs,
    notes: 'Cozy candlelight atmosphere. The handmade truffle pasta was exceptional.',
    tags: ['trattoria bella', 'italian', 'pasta', 'sarah', 'truffle'],
  });

  // Seed Travel
  await travelRepo.add(uid, {
    destination: 'Kyoto & Tokyo',
    budget: 3200,
    durationDays: 10,
    startDate: now - 45 * dayMs,
    endDate: now - 35 * dayMs,
    rating: 9.6,
    status: 'completed',
    companions: ['Sarah'],
    places: ['Fushimi Inari', 'Arashiyama Bamboo Grove', 'Shibuya Crossing', 'Akihabara'],
    favoriteMoments: ['Early morning stroll through Fushimi Inari torii gates', 'Authentic ramen in Shinjuku'],
    favorite: true,
    notes: 'Best trip ever. Perfect blend of traditional culture and modern energy.',
    tags: ['kyoto', 'tokyo', 'japan', 'sarah', 'fushimi inari'],
  });

  await travelRepo.add(uid, {
    destination: 'Iceland Ring Road',
    budget: 4500,
    durationDays: 7,
    startDate: now + 180 * dayMs,
    endDate: now + 187 * dayMs,
    status: 'planned',
    places: ['Golden Circle', 'Black Sand Beach', 'Blue Lagoon', 'Jökulsárlón Glacier Lagoon'],
    notes: 'Planned road trip to explore waterfalls and glaciers next February.',
    tags: ['iceland', 'ring road', 'glaciers', 'waterfalls', 'planned'],
  });

  // Seed Notes
  await noteRepo.add(uid, {
    title: 'Sci-Fi & Cinema Preferences',
    type: 'thought',
    text: 'I notice I prefer slower, atmospheric sci-fi stories when I need to decompress after busy work weeks.',
    date: now - 5 * dayMs,
    tags: ['sci-fi', 'cinema', 'decompression', 'preference'],
  });

  await noteRepo.add(uid, {
    title: 'EchoOS Memory Architecture',
    type: 'idea',
    text: 'Build a private memory OS that grounds AI responses strictly in user evidence and taste evolution.',
    date: now - 20 * dayMs,
    tags: ['echoos', 'architecture', 'memory', 'ai'],
  });

  // Seed Wishlist
  await wishlistRepo.add(uid, {
    title: 'Interstellar IMAX 70mm',
    category: 'movie',
    note: 'Catch the 10th anniversary IMAX screening',
    done: false,
    tags: ['interstellar', 'imax', 'movie'],
  });

  await wishlistRepo.add(uid, {
    title: 'Climb Mount Fuji',
    category: 'place',
    note: 'During official summer climbing season',
    done: false,
    tags: ['mount fuji', 'japan', 'climb'],
  });

  // Seed Goals
  await goalRepo.add(uid, {
    title: 'Daily Morning Run',
    description: 'Run 3km every morning at 7 AM for fitness and energy',
    frequency: 'daily',
    streak: 12,
    completionRate: 92,
    status: 'active',
    checkIns: [{ date: yesterday, completed: true }],
    tags: ['running', 'fitness', 'morning', 'habit'],
  });

  await goalRepo.add(uid, {
    title: 'Read 20 Pages Daily',
    description: 'Read non-fiction or sci-fi books before sleep',
    frequency: 'daily',
    streak: 5,
    completionRate: 85,
    status: 'active',
    tags: ['reading', 'books', 'night', 'habit'],
  });
}
