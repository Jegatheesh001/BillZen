"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddEventSheet } from '@/components/events/AddEventSheet';
import { EventCard } from '@/components/events/EventCard';
import { useAppData } from '@/context/AppDataContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EventsPage() {
  const [isAddEventSheetOpen, setIsAddEventSheetOpen] = useState(false);
  const { events, users, expenses } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = useMemo(() => {
    if (!searchTerm) return events;
    return events.filter(event => 
      event.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [events, searchTerm]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Events</h2>
        <Button onClick={() => setIsAddEventSheetOpen(true)} size="sm" className="rounded-full">
          <PlusCircle className="mr-2 h-5 w-5" /> Create Event
        </Button>
      </div>

       <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search events..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-3">Your Events</h3>
        {filteredEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No events created yet. <br/>Click &quot;Create Event&quot; to start grouping expenses!
          </p>
        ) : (
          <ScrollArea className="h-[calc(100vh-22rem)]"> {/* Adjust height as needed */}
             <div className="space-y-4 pr-2">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} users={users} expenses={expenses} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <AddEventSheet open={isAddEventSheetOpen} onOpenChange={setIsAddEventSheetOpen} />
    </div>
  );
}
