"use client";

import { ProfileForm } from '@/components/profile/ProfileForm';

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-start pt-2 md:pt-8">
      <ProfileForm />
    </div>
  );
}
