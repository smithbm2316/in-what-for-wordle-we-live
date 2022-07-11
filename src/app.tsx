import { Combobox } from '@headlessui/react';
import { useState } from 'preact/hooks';

const people = [
  'Durward Reynolds',
  'Kenton Towne',
  'Therese Wunsch',
  'Benedict Kessler',
  'Katelyn Rohan',
];

function sendDataToSW(data: any) {
  if (window.navigator.serviceWorker.controller) {
    window.navigator.serviceWorker.controller.postMessage(data);
  }
}

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
        onChange={(person) => {
          setSelectedPerson(person);
          sendDataToSW({ person });
        }}
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
