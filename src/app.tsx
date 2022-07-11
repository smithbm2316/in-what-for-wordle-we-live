import { Combobox } from '@headlessui/react';
import { useState } from 'preact/hooks';

const people = [
  'Durward Reynolds',
  'Kenton Towne',
  'Therese Wunsch',
  'Benedict Kessler',
  'Katelyn Rohan',
];

export function App() {
  const [selectedPerson, setSelectedPerson] = useState(people[0]);
  const [query, setQuery] = useState('');

  const filteredPeople =
    query === ''
      ? people
      : people.filter((person) => {
          return person.toLowerCase().includes(query.toLowerCase());
        });

  return (
    <div className='w-full h-screen grid place-items-center'>
      <Combobox
        as='div'
        value={selectedPerson}
        onChange={setSelectedPerson}
        className='relative'
      >
        <Combobox.Input
          onChange={(event) => setQuery(event.target.value)}
          className='border border-black rounded'
        />
        <Combobox.Options className='absolute mt-2 w-full border border-black'>
          {filteredPeople.map((person) => (
            <Combobox.Option key={person} value={person}>
              {person}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox>
    </div>
  );
}
