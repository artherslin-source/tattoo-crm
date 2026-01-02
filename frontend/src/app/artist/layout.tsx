import ArtistSidebar from '@/components/ArtistSidebar';

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <ArtistSidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <main className="flex-1 p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
